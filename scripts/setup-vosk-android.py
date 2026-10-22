#!/usr/bin/env python3
"""Install the native offline Persian Vosk plugin into the generated Capacitor Android app."""
from pathlib import Path
import re

root = Path("android")
if not root.exists():
    raise SystemExit("Android platform was not generated")

main_activity = next(root.glob("app/src/main/java/**/MainActivity.java"), None)
if main_activity is None:
    raise SystemExit("Could not find generated MainActivity.java")
source = main_activity.read_text()
package_match = re.search(r"^\s*package\s+([\w.]+)\s*;", source, re.M)
if not package_match:
    raise SystemExit("Could not detect Android package name")
package_name = package_match.group(1)
plugin_path = main_activity.parent / "VoskSpeechRecognitionPlugin.java"
plugin = r'''package __PACKAGE__;

import android.Manifest;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.vosk.Model;
import org.vosk.android.SpeechService;
import org.vosk.android.RecognitionListener;
import org.json.JSONObject;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@CapacitorPlugin(name = "VoskSpeechRecognition", permissions = {
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
})
public class VoskSpeechRecognitionPlugin extends Plugin implements RecognitionListener {
    private static final String TAG = "SaiSaiVosk";
    private static final String MODEL_NAME = "vosk-model-small-fa-0.42";
    private static final String MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-fa-0.42.zip";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile boolean listening = false;
    private volatile boolean stopping = false;
    private Model model;
    private SpeechService speechService;
    private PluginCall activeCall;

    @PluginMethod
    public void prepare(PluginCall call) {
        executor.execute(() -> {
            try {
                ensureModel();
                main.post(() -> call.resolve());
            } catch (Exception e) {
                Log.e(TAG, "Model preload failed", e);
                main.post(() -> call.reject("دریافت مدل گفتار فارسی انجام نشد؛ با اتصال اینترنت دوباره تلاش می‌شود."));
            }
        });
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject result = new JSObject(); result.put("granted", true); call.resolve(result); return;
        }
        requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(result);
    }

    @PluginMethod
    public void isListening(PluginCall call) {
        JSObject result = new JSObject(); result.put("listening", listening); call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (listening) { call.reject("تشخیص صوتی دیگری در حال اجراست"); return; }
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("اجازه دسترسی به میکروفون لازم است"); return;
        }
        activeCall = call;
        stopping = false;
        executor.execute(() -> {
            try {
                ensureModel();
                if (stopping || activeCall != call) return;
                main.post(() -> beginRecognition(call));
            } catch (Exception e) {
                Log.e(TAG, "Model setup failed", e);
                main.post(() -> finishWithError(call, "آماده‌سازی مدل آفلاین گفتار ناموفق بود. اینترنت را بررسی کنید و دوباره تلاش کنید."));
            }
        });
    }

    private synchronized void ensureModel() throws Exception {
        if (model != null) return;
        File modelDir = new File(getContext().getFilesDir(), MODEL_NAME);
        File marker = new File(modelDir, "am/final.mdl");
        if (!marker.isFile()) {
            File zipFile = new File(getContext().getFilesDir(), MODEL_NAME + ".zip");
            File tempDir = new File(getContext().getFilesDir(), MODEL_NAME + ".extracting");
            deleteRecursively(tempDir);
            HttpURLConnection connection = (HttpURLConnection) new URL(MODEL_URL).openConnection();
            connection.setConnectTimeout(20000);
            connection.setReadTimeout(60000);
            connection.setInstanceFollowRedirects(true);
            connection.connect();
            if (connection.getResponseCode() != 200) throw new Exception("Model download HTTP " + connection.getResponseCode());
            try (InputStream in = new BufferedInputStream(connection.getInputStream());
                 FileOutputStream out = new FileOutputStream(zipFile)) {
                byte[] buffer = new byte[32768]; int n;
                while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
            } finally { connection.disconnect(); }
            tempDir.mkdirs();
            try (ZipInputStream zin = new ZipInputStream(new BufferedInputStream(new java.io.FileInputStream(zipFile)))) {
                ZipEntry entry;
                while ((entry = zin.getNextEntry()) != null) {
                    String name = entry.getName();
                    if (name.startsWith("/") || name.contains("../")) throw new Exception("Unsafe model archive");
                    File target = new File(tempDir, name);
                    if (!target.getCanonicalPath().startsWith(tempDir.getCanonicalPath() + File.separator)) throw new Exception("Unsafe model path");
                    if (entry.isDirectory()) target.mkdirs();
                    else {
                        File parent = target.getParentFile(); if (parent != null) parent.mkdirs();
                        try (BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(target))) {
                            byte[] buffer = new byte[32768]; int n;
                            while ((n = zin.read(buffer)) >= 0) out.write(buffer, 0, n);
                        }
                    }
                    zin.closeEntry();
                }
            }
            File extracted = new File(tempDir, MODEL_NAME);
            if (!new File(extracted, "am/final.mdl").isFile()) throw new Exception("Downloaded Persian model is incomplete");
            deleteRecursively(modelDir);
            if (!extracted.renameTo(modelDir)) throw new Exception("Could not install Persian model");
            deleteRecursively(tempDir); zipFile.delete();
        }
        model = new Model(modelDir.getAbsolutePath());
    }

    private void beginRecognition(PluginCall call) {
        if (stopping || activeCall != call) return;
        try {
            speechService = new SpeechService(model, 16000.0f);
            listening = true;
            speechService.startListening(this);
            main.postDelayed(() -> {
                if (activeCall == call && listening) finishWithError(call, "صدایی تشخیص داده نشد؛ دوباره نزدیک میکروفون صحبت کنید.");
            }, 25000);
        } catch (Exception e) {
            finishWithError(call, "شروع شنیدن صدا ناموفق بود.");
        }
    }

    @Override public void onPartialResult(String hypothesis) {}
    @Override public void onResult(String hypothesis) { handleResult(hypothesis); }
    @Override public void onFinalResult(String hypothesis) { handleResult(hypothesis); }
    @Override public void onError(Exception exception) {
        Log.e(TAG, "Recognition error", exception);
        PluginCall call = activeCall;
        if (call != null) main.post(() -> finishWithError(call, "خطا در شنیدن صدا؛ دوباره تلاش کنید."));
    }
    @Override public void onTimeout() {
        PluginCall call = activeCall;
        if (call != null) main.post(() -> finishWithError(call, "زمان شنیدن صدا تمام شد؛ دوباره تلاش کنید."));
    }

    private void handleResult(String json) {
        PluginCall call = activeCall;
        if (call == null || stopping) return;
        try {
            String text = new JSONObject(json).optString("text", "").trim();
            if (!text.isEmpty()) main.post(() -> {
                if (activeCall != call || stopping) return;
                stopService();
                JSObject result = new JSObject(); result.put("text", text);
                call.resolve(result); activeCall = null;
            });
        } catch (Exception e) { Log.w(TAG, "Could not parse recognition result", e); }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopping = true;
        stopService();
        PluginCall pending = activeCall;
        activeCall = null;
        if (pending != null) pending.reject("شنیدن صدا لغو شد");
        call.resolve();
    }

    private void finishWithError(PluginCall call, String message) {
        if (activeCall != call) return;
        stopService(); activeCall = null; call.reject(message);
    }

    private void stopService() {
        listening = false;
        if (speechService != null) {
            try { speechService.stop(); } catch (Exception ignored) {}
            try { speechService.shutdown(); } catch (Exception ignored) {}
            speechService = null;
        }
    }

    private void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteRecursively(child);
        file.delete();
    }
}
'''.replace("__PACKAGE__", package_name)
plugin_path.write_text(plugin)

# Capacitor's default MainActivity may not declare onCreate at all.
# Ensure Bundle is imported before injecting/creating that method.
if "import android.os.Bundle;" not in source:
    source = re.sub(
        r"(^package [^;]+;\s*)",
        r"\1\nimport android.os.Bundle;\n",
        source,
        count=1,
        flags=re.M,
    )

if "registerPlugin(VoskSpeechRecognitionPlugin.class);" not in source:
    on_create = re.search(r"public void onCreate\(Bundle savedInstanceState\)\s*\{", source)
    if on_create:
        body_start = on_create.end()
        body_end = source.find("}", body_start)
        body = source[body_start:body_end if body_end >= 0 else len(source)]
        if "super.onCreate(savedInstanceState);" in body:
            source = source[:body_start] + body.replace(
                "super.onCreate(savedInstanceState);",
                "super.onCreate(savedInstanceState);\n        registerPlugin(VoskSpeechRecognitionPlugin.class);",
                1,
            ) + source[body_start + len(body):]
        else:
            source = source[:body_start] + "\n        super.onCreate(savedInstanceState);\n        registerPlugin(VoskSpeechRecognitionPlugin.class);\n" + source[body_start:]
    else:
        class_end = source.rfind("}")
        if class_end < 0:
            raise SystemExit("Could not find end of MainActivity class")
        method = """
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(VoskSpeechRecognitionPlugin.class);
    }
"""
        source = source[:class_end] + method + source[class_end:]

main_activity.write_text(source)

gradle = root / "app/build.gradle"
gs = gradle.read_text()
dependency = 'implementation "com.alphacephei:vosk-android:0.3.47"'
if dependency not in gs:
    match = re.search(r"dependencies\s*\{", gs)
    if not match: raise SystemExit("Could not find dependencies block in app/build.gradle")
    gs = gs[:match.end()] + "\n    " + dependency + gs[match.end():]
    gradle.write_text(gs)

manifest = root / "app/src/main/AndroidManifest.xml"
ms = manifest.read_text()
permission = '<uses-permission android:name="android.permission.RECORD_AUDIO" />'
if permission not in ms:
    ms = re.sub(r"(<manifest\b[^>]*>)", r"\1\n    " + permission, ms, count=1)
    manifest.write_text(ms)

print("Installed Vosk offline Persian recognition plugin.")
