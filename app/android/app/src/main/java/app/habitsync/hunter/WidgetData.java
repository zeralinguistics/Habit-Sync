package app.habitsync.hunter;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import java.io.File;
import java.util.Calendar;
import java.util.Locale;

/** The home-screen widgets are pictures drawn by the web app at each widget's exact size. This class stores them, and shows them. */
final class WidgetData {
    static final String PREFS = "habit_widget";
    static final String KIND_STREAK = "streak", KIND_WEEK = "week", KIND_TODAY = "today";

    private static final Object LOCK = new Object();

    private WidgetData() {}

    /** Adds water poured from a widget. The tap and the app both touch this number, so it is changed under one lock. */
    static void addWater(Context c, int ml) {
        synchronized (LOCK) {
            SharedPreferences p = sp(c);
            p.edit().putInt("pendingWater", p.getInt("pendingWater", 0) + ml).apply();
        }
    }

    /** Returns the queued water once and clears it. */
    static int takeWater(Context c) {
        synchronized (LOCK) {
            SharedPreferences p = sp(c);
            int ml = p.getInt("pendingWater", 0);
            if (ml != 0) {
                p.edit().putInt("pendingWater", 0).apply();
            }
            return ml;
        }
    }

    static SharedPreferences sp(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static File imgFile(Context c, int id) {
        return new File(c.getFilesDir(), "widget_" + id + ".png");
    }

    /** The app's day ends at dayStart (3 am by default), so before that hour it is still yesterday. */
    static String todayKey(int dayStart) {
        Calendar c = Calendar.getInstance();
        c.add(Calendar.HOUR_OF_DAY, -dayStart);
        return String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    /** True while the picture belongs to today. After the day changes it is stale until the app is opened. */
    static boolean fresh(SharedPreferences p) {
        String day = p.getString("day", "");
        return !day.isEmpty() && day.equals(todayKey(p.getInt("dayStart", 3)));
    }

    static Class<?> providerFor(String kind) {
        if (KIND_WEEK.equals(kind)) return WeekWidget.class;
        if (KIND_TODAY.equals(kind)) return TodayWidget.class;
        return StreakWidget.class;
    }

    static int[] ids(Context ctx, AppWidgetManager m, String kind) {
        int[] a = m.getAppWidgetIds(new ComponentName(ctx, providerFor(kind)));
        return a == null ? new int[0] : a;
    }

    /** The size of a widget on the home screen in dp (portrait), or a sensible default for its kind. */
    static int[] sizeOf(AppWidgetManager m, int id, String kind) {
        Bundle o = m.getAppWidgetOptions(id);
        int w = o == null ? 0 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int h = o == null ? 0 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        if (w < 40) w = KIND_STREAK.equals(kind) ? 158 : 320;
        if (h < 40) h = KIND_STREAK.equals(kind) ? 158 : KIND_WEEK.equals(kind) ? 78 : 158;
        return new int[] {w, h};
    }

    static void updateAll(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        apply(ctx, m, ids(ctx, m, KIND_STREAK), KIND_STREAK);
        apply(ctx, m, ids(ctx, m, KIND_WEEK), KIND_WEEK);
        apply(ctx, m, ids(ctx, m, KIND_TODAY), KIND_TODAY);
    }

    /** Tapping a widget opens the app. */
    static PendingIntent openApp(Context ctx) {
        Intent i = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (i == null) i = new Intent();
        return PendingIntent.getActivity(ctx, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static int layoutFor(String kind) {
        if (KIND_WEEK.equals(kind)) return R.layout.widget_week;
        if (KIND_TODAY.equals(kind)) return R.layout.widget_today;
        return R.layout.widget_streak;
    }

    /** The label of the water button: the plain amount, or what is waiting for the app to pick up. */
    static String waterLabel(int pending) {
        if (pending <= 0) return "+250 ml";
        if (pending >= 1000) return String.format(Locale.US, "+%.1f L \u2713", pending / 1000.0);
        return "+" + pending + " ml \u2713";
    }

    static void apply(Context ctx, AppWidgetManager m, int[] ids, String kind) {
        if (ids == null || ids.length == 0) return;
        SharedPreferences p = sp(ctx);
        boolean fresh = fresh(p), today = KIND_TODAY.equals(kind);
        int pending = p.getInt("pendingWater", 0);
        for (int id : ids) {
            try {
            // the layout already holds the empty picture, so a widget the app has not drawn yet still looks finished
            RemoteViews v = new RemoteViews(ctx.getPackageName(), layoutFor(kind));
            File f = imgFile(ctx, id);
            Bitmap bmp = f.exists() ? BitmapFactory.decodeFile(f.getPath()) : null;
            if (bmp != null) {
                v.setImageViewBitmap(R.id.w_img, bmp);
                // after midnight the picture is yesterday's: it fades and says so, until the app is opened
                v.setInt(R.id.w_img, "setImageAlpha", fresh ? 255 : 120);
                v.setViewVisibility(R.id.w_stale, fresh ? View.GONE : View.VISIBLE);
            } else {
                v.setViewVisibility(R.id.w_stale, View.GONE);
            }
            v.setOnClickPendingIntent(R.id.w_root, openApp(ctx));
            if (today) {
                v.setTextViewText(R.id.w_water_btn, waterLabel(pending));
                v.setViewVisibility(R.id.w_water_btn, bmp != null && fresh ? View.VISIBLE : View.GONE);
                Intent wi = new Intent(ctx, TodayWidget.class).setAction(TodayWidget.ACTION_WATER);
                v.setOnClickPendingIntent(R.id.w_water_btn, PendingIntent.getBroadcast(ctx, 7, wi, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            m.updateAppWidget(id, v);
            } catch (Throwable t) {
                // one widget that cannot be drawn must not stop the others, or the app
            }
        }
    }
}
