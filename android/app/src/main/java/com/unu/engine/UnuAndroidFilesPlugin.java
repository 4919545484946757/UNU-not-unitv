package com.unu.engine;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.provider.DocumentsContract;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.activity.result.ActivityResult;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "UnuAndroidFiles")
public class UnuAndroidFilesPlugin extends Plugin {
    @PluginMethod
    public void pickDirectory(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
        );
        startActivityForResult(call, intent, "pickDirectoryResult");
    }

    @PluginMethod
    public void pickFiles(PluginCall call) {
        String accept = call.getString("accept", "*/*");
        boolean multiple = call.getBoolean("multiple", true);
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(normalizeAccept(accept));
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "pickFilesResult");
    }

    @PluginMethod
    public void openFileManager(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        startActivityForResult(call, intent, "openFileManagerResult");
    }

    @PluginMethod
    public void writeFileToTree(PluginCall call) {
        String treeUriValue = call.getString("treeUri", "");
        String path = call.getString("path", "");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String data = call.getString("data", "");
        boolean base64 = call.getBoolean("base64", false);
        if (treeUriValue.isEmpty() || path.isEmpty()) {
            call.reject("treeUri and path are required.");
            return;
        }
        try {
            Uri uri = writeFileToTree(Uri.parse(treeUriValue), path, mimeType, data, base64);
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception error) {
            call.reject("Failed to write Android tree file: " + error.getMessage());
        }
    }

    @ActivityCallback
    private void pickDirectoryResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.resolve(null);
            return;
        }
        Uri uri = result.getData().getData();
        persistUriPermission(uri, result.getData().getFlags());
        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        ret.put("name", getDisplayName(uri, "Android Directory"));
        call.resolve(ret);
    }

    @ActivityCallback
    private void pickFilesResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.resolve(null);
            return;
        }
        JSArray files = new JSArray();
        Intent data = result.getData();
        ClipData clipData = data.getClipData();
        try {
            if (clipData != null) {
                for (int index = 0; index < clipData.getItemCount(); index++) {
                    files.put(readUriFile(clipData.getItemAt(index).getUri()));
                }
            } else if (data.getData() != null) {
                files.put(readUriFile(data.getData()));
            }
            JSObject ret = new JSObject();
            ret.put("files", files);
            call.resolve(ret);
        } catch (Exception error) {
            call.reject("Failed to read selected Android file: " + error.getMessage());
        }
    }

    @ActivityCallback
    private void openFileManagerResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        ret.put("ok", result.getResultCode() == Activity.RESULT_OK);
        call.resolve(ret);
    }

    private JSObject readUriFile(Uri uri) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        String mime = resolver.getType(uri);
        if (mime == null || mime.isEmpty()) mime = "application/octet-stream";
        byte[] bytes = readAllBytes(resolver.openInputStream(uri));
        JSObject file = new JSObject();
        file.put("uri", uri.toString());
        file.put("name", getDisplayName(uri, "selected-file"));
        file.put("mimeType", mime);
        file.put("dataUrl", "data:" + mime + ";base64," + Base64.encodeToString(bytes, Base64.NO_WRAP));
        file.put("size", bytes.length);
        return file;
    }

    private byte[] readAllBytes(InputStream stream) throws Exception {
        if (stream == null) return new byte[0];
        try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            return output.toByteArray();
        }
    }

    private void persistUriPermission(Uri uri, int flags) {
        int modeFlags = flags & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try {
            getContext().getContentResolver().takePersistableUriPermission(uri, modeFlags);
        } catch (Exception ignored) {
        }
    }

    private String getDisplayName(Uri uri, String fallback) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    String name = cursor.getString(index);
                    if (name != null && !name.isEmpty()) return name;
                }
            }
        } catch (Exception ignored) {
        }
        String last = uri.getLastPathSegment();
        return last == null || last.isEmpty() ? fallback : last;
    }

    private String normalizeAccept(String accept) {
        if (accept == null || accept.isEmpty()) return "*/*";
        String first = accept.split(",")[0].trim();
        if (first.endsWith("/*") || first.contains("/")) return first;
        return "*/*";
    }

    private Uri writeFileToTree(Uri treeUri, String relativePath, String mimeType, String data, boolean isBase64) throws Exception {
        String normalized = relativePath.replace("\\", "/").replaceAll("^/+", "");
        String[] parts = normalized.split("/");
        if (parts.length == 0) throw new IllegalArgumentException("Invalid path.");
        ContentResolver resolver = getContext().getContentResolver();
        String treeDocumentId = DocumentsContract.getTreeDocumentId(treeUri);
        Uri parent = DocumentsContract.buildDocumentUriUsingTree(treeUri, treeDocumentId);
        for (int index = 0; index < parts.length - 1; index++) {
            if (parts[index].isEmpty()) continue;
            Uri child = findChildDocument(treeUri, parent, parts[index], DocumentsContract.Document.MIME_TYPE_DIR);
            if (child == null) child = DocumentsContract.createDocument(resolver, parent, DocumentsContract.Document.MIME_TYPE_DIR, parts[index]);
            if (child == null) throw new IllegalStateException("Failed to create directory: " + parts[index]);
            parent = child;
        }

        String fileName = parts[parts.length - 1];
        Uri file = findChildDocument(treeUri, parent, fileName, null);
        if (file == null) file = DocumentsContract.createDocument(resolver, parent, mimeType, fileName);
        if (file == null) throw new IllegalStateException("Failed to create file: " + fileName);
        byte[] bytes = isBase64 ? Base64.decode(data, Base64.DEFAULT) : data.getBytes(StandardCharsets.UTF_8);
        try (OutputStream output = resolver.openOutputStream(file, "wt")) {
            if (output == null) throw new IllegalStateException("Failed to open output stream.");
            output.write(bytes);
        }
        return file;
    }

    private Uri findChildDocument(Uri treeUri, Uri parent, String name, String requiredMime) {
        ContentResolver resolver = getContext().getContentResolver();
        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, DocumentsContract.getDocumentId(parent));
        try (Cursor cursor = resolver.query(
            childrenUri,
            new String[] {
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE
            },
            null,
            null,
            null
        )) {
            if (cursor == null) return null;
            while (cursor.moveToNext()) {
                String displayName = cursor.getString(1);
                String mime = cursor.getString(2);
                if (!name.equals(displayName)) continue;
                if (requiredMime != null && !requiredMime.equals(mime)) continue;
                return DocumentsContract.buildDocumentUriUsingTree(treeUri, cursor.getString(0));
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
