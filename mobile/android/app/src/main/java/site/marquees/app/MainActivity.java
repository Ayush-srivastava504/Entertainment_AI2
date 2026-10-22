package site.marquees.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

/**
 * Native behavior around the marquees.site WebView:
 *  - Back button: walks WebView history, exits the app from the first page.
 *  - Pull-to-refresh (only when the page is scrolled to the top).
 *  - Deep links: https://marquees.site/... opens inside the app (cold and warm start).
 *  - Offline screen (https://localhost/offline.html) never traps the user.
 */
public class MainActivity extends BridgeActivity {

    private static final String SITE_URL = "https://marquees.site";
    private static final String SITE_HOST = "marquees.site";
    // Pages bundled in the app (offline.html) are served from this origin.
    private static final String LOCAL_ORIGIN = "https://localhost";

    private SwipeRefreshLayout refreshLayout;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // super.onCreate() builds the bridge, loads the site, and then calls our
        // onNewIntent() with the launch intent, which handles cold-start deep links.
        super.onCreate(savedInstanceState);
        createDefaultPushChannel();
        installBackHandler();
        installPullToRefresh();
    }

    // -------------------------------------------------------- push notifications

    // Must exist before the first FCM message arrives, with an id matching
    // res/values/push_notifications.xml's default_notification_channel_id
    // (referenced from AndroidManifest.xml); otherwise FCM silently falls back
    // to its own default channel instead of this one. Created here, natively,
    // so it exists even if a push arrives before the WebView's JS has run.
    private void createDefaultPushChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            getString(R.string.default_notification_channel_id),
            "General",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("New posts and updates from Marquee");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openDeepLink(intent);
    }

    // ---------------------------------------------------------------- back button

    private void installBackHandler() {
        // Registered after Capacitor's own handlers, so it runs first.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = currentWebView();
                String url = webView != null ? webView.getUrl() : null;
                boolean onLocalPage = url == null || url.startsWith(LOCAL_ORIGIN);
                if (webView != null && webView.canGoBack() && !onLocalPage) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });
    }

    // ------------------------------------------------------------ pull-to-refresh

    private void installPullToRefresh() {
        final WebView webView = currentWebView();
        if (webView == null || !(webView.getParent() instanceof ViewGroup)) {
            return;
        }
        final ViewGroup parent = (ViewGroup) webView.getParent();
        final int index = parent.indexOfChild(webView);
        final ViewGroup.LayoutParams originalParams = webView.getLayoutParams();

        parent.removeView(webView);
        refreshLayout = new SwipeRefreshLayout(this);
        refreshLayout.setColorSchemeColors(Color.parseColor("#2A3FF0"));
        refreshLayout.setProgressBackgroundColorSchemeColor(Color.parseColor("#FFD84A"));
        refreshLayout.addView(
            webView,
            new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        );
        parent.addView(refreshLayout, index, originalParams);

        refreshLayout.setOnRefreshListener(() -> {
            String url = webView.getUrl();
            if (url == null || url.startsWith(LOCAL_ORIGIN)) {
                webView.loadUrl(SITE_URL + "/");
            } else {
                webView.reload();
            }
            // Safety net so the spinner can never get stuck on a slow connection.
            refreshLayout.postDelayed(this::stopRefreshing, 8000);
        });

        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView view) {
                stopRefreshing();
            }

            @Override
            public void onReceivedError(WebView view) {
                stopRefreshing();
            }

            @Override
            public void onReceivedHttpError(WebView view) {
                stopRefreshing();
            }
        });
    }

    private void stopRefreshing() {
        if (refreshLayout != null && refreshLayout.isRefreshing()) {
            refreshLayout.setRefreshing(false);
        }
    }

    // ----------------------------------------------------------------- deep links

    private void openDeepLink(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) {
            return;
        }
        Uri data = intent.getData();
        WebView webView = currentWebView();
        if (data == null || webView == null || !"https".equals(data.getScheme())) {
            return;
        }
        String host = data.getHost();
        if (host == null || !(host.equals(SITE_HOST) || host.equals("www." + SITE_HOST))) {
            return;
        }
        String path = data.getEncodedPath();
        if (path == null || path.isEmpty() || path.startsWith("/admin") || path.startsWith("/api/admin")) {
            path = "/";
        }
        String query = data.getEncodedQuery();
        // Always rebuilt on the canonical host so a www link cannot bounce through a redirect.
        webView.loadUrl(SITE_URL + path + (query != null ? "?" + query : ""));
    }

    private WebView currentWebView() {
        return getBridge() != null ? getBridge().getWebView() : null;
    }
}
