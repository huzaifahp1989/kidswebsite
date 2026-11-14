package com.imedia.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private static final String START_URL = "https://imediackids.com/";
    private static final int REQUEST_CODE_FILE_CHOOSER = 1001;

    private WebView webView;
    private NotificationsJsBridge notificationsJsBridge;
    private InAppReviewManager inAppReviewManager;
    // The pending `<input type="file">` request, answered in onActivityResult.
    private ValueCallback<Uri[]> fileChooserCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SystemBarUtils.enable(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Keep review eligibility and prompt history in one native service instance.
        inAppReviewManager = new InAppReviewManager(this);
        inAppReviewManager.recordAppOpen();

        SystemBarUtils.applySystemBarInsets(findViewById(R.id.main_root), true);

        initializeWebView();
    }

    private void initializeWebView() {
        webView = findViewById(R.id.webview);
        if (webView == null) return;
        setupWebView();
        attachJavascriptBridges();
        webView.loadUrl(START_URL);
    }

    private void attachJavascriptBridges() {
        if (webView == null) return;
        webView.addJavascriptInterface(new AlarmJsBridge(this), "AndroidAlarm");
        // Expose the native review service to engagement events from the web experience.
        webView.addJavascriptInterface(new ReviewJsBridge(this, inAppReviewManager), "AndroidReview");
        notificationsJsBridge = new NotificationsJsBridge(this);
        webView.addJavascriptInterface(notificationsJsBridge, "AndroidNotifications");
        // On-device reminder notifications — no push subscription required.
        webView.addJavascriptInterface(new ReminderAlarmBridge(this), "AndroidReminders");
    }

    private void restoreWebView() {
        setContentView(R.layout.activity_main);
        SystemBarUtils.applySystemBarInsets(findViewById(R.id.main_root), true);
        initializeWebView();
    }

    private void cleanupWebView(WebView view) {
        if (view == null) return;

        try {
            view.stopLoading();
        } catch (Exception ignored) {
        }
        try {
            view.loadUrl("about:blank");
        } catch (Exception ignored) {
        }
        try {
            view.onPause();
            view.pauseTimers();
        } catch (Exception ignored) {
        }
        try {
            view.clearHistory();
        } catch (Exception ignored) {
        }
        try {
            view.clearCache(false);
        } catch (Exception ignored) {
        }
        try {
            ViewGroup parent = (ViewGroup) view.getParent();
            if (parent != null) {
                parent.removeView(view);
            }
        } catch (Exception ignored) {
        }
        try {
            view.removeAllViews();
        } catch (Exception ignored) {
        }
        try {
            view.destroy();
        } catch (Exception ignored) {
        }
    }

    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        // Required so `target="_blank"` links (social media etc.) reach
        // onCreateWindow, where they are handed to the external browser.
        webSettings.setSupportMultipleWindows(true);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            webSettings.setOffscreenPreRaster(false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_BOUND, true);
        }

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                // `target="_blank"` / window.open links (social media, external
                // sites) must leave the app — the WebView itself is never used,
                // which also avoids the popup crashes this previously guarded against.
                return openNewWindowExternally(view);
            }

            @Override
            public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams fileChooserParams
            ) {
                return openFileChooser(callback, fileChooserParams);
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                try {
                    if (url == null) return false;
                    if (isAppUrl(url)) {
                        return false;
                    }
                    openExternally(url);
                    return true;
                } catch (Exception ignored) {
                    return false;
                }
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                cleanupWebView(view);
                if (view == webView) {
                    webView = null;
                    restoreWebView();
                }
                return true;
            }
        });
    }

    /**
     * Sends a `target="_blank"` / window.open request to the external browser
     * instead of loading it inside the app. Without this, social media links are
     * silently swallowed by the WebView.
     */
    private boolean openNewWindowExternally(WebView view) {
        try {
            WebView.HitTestResult result = view.getHitTestResult();
            String url = result != null ? result.getExtra() : null;
            if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                openExternally(url);
                return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    /** Hands a URL to the device's browser rather than the WebView. */
    private void openExternally(String url) {
        if (url == null || url.isEmpty()) return;
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception ignored) {
        }
    }

    /**
     * Opens the Android file/gallery picker for an `<input type="file">`.
     *
     * The WebView silently ignores every file input when the chrome client does
     * not answer this callback, which is why the admin "Browse & upload" button
     * did nothing inside the app. The chosen file arrives in onActivityResult and
     * is handed back to the page, which then uploads it as usual.
     */
    private boolean openFileChooser(
        ValueCallback<Uri[]> callback,
        WebChromeClient.FileChooserParams params
    ) {
        if (fileChooserCallback != null) {
            // A previous picker is still open — release it so the WebView does
            // not wait forever for an answer that will never come.
            fileChooserCallback.onReceiveValue(null);
        }
        fileChooserCallback = callback;
        try {
            Intent intent = params.createIntent();
            startActivityForResult(intent, REQUEST_CODE_FILE_CHOOSER);
            return true;
        } catch (Exception e) {
            fileChooserCallback = null;
            return false;
        }
    }

    private boolean isAppUrl(String url) {
        return url.contains("traeimedia3phmb.vercel.app")
            || url.contains("imediackids.com")
            || url.startsWith("http://localhost")
            || url.startsWith("https://localhost")
            || url.startsWith("http://10.0.2.2")
            || url.startsWith("https://10.0.2.2");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_CODE_FILE_CHOOSER) return;
        if (fileChooserCallback == null) return;

        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        }
        fileChooserCallback.onReceiveValue(result);
        fileChooserCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NotificationsJsBridge.REQUEST_CODE && notificationsJsBridge != null) {
            notificationsJsBridge.onAndroidPermissionResult();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (level >= TRIM_MEMORY_RUNNING_LOW && webView != null) {
            try {
                webView.clearCache(false);
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    protected void onDestroy() {
        cleanupWebView(webView);
        webView = null;
        super.onDestroy();
    }
}
