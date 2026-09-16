package com.imedia.app;

import android.view.View;

import androidx.activity.ComponentActivity;
import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

/**
 * Enables backward-compatible edge-to-edge display and applies system bar insets
 * so content is not obscured behind the status bar, navigation bar, or display cutout.
 */
public final class SystemBarUtils {

    private SystemBarUtils() {
    }

    public static void enable(ComponentActivity activity) {
        EdgeToEdge.enable(activity);
    }

    public static void applySystemBarInsets(View view) {
        applySystemBarInsets(view, false);
    }

    public static void applySystemBarInsets(View view, boolean includeIme) {
        ViewCompat.setOnApplyWindowInsetsListener(view, (v, windowInsets) -> {
            Insets systemBars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            int bottom = systemBars.bottom;
            if (includeIme) {
                Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                bottom = Math.max(bottom, ime.bottom);
            }
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, bottom);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(view);
    }
}
