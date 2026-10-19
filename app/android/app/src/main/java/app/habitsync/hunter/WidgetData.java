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

    private WidgetData() {}

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

    static void apply(Context ctx, AppWidgetManager m, int[] ids, String kind) {
        if (ids == null || ids.length == 0) return;
        SharedPreferences p = sp(ctx);
        boolean fresh = fresh(p), today = KIND_TODAY.equals(kind);
        int pending = p.getInt("pendingWater", 0);
        for (int id : ids) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), today ? R.layout.widget_img_water : R.layout.widget_img);
            File f = imgFile(ctx, id);
            Bitmap bmp = f.exists() ? BitmapFactory.decodeFile(f.getPath()) : null;
            if (bmp != null) {
                v.setImageViewBitmap(R.id.w_img, bmp);
                v.setViewVisibility(R.id.w_hint, View.GONE);
                v.setViewVisibility(R.id.w_stale, fresh ? View.GONE : View.VISIBLE);
            } else {
                v.setViewVisibility(R.id.w_hint, View.VISIBLE);
                v.setViewVisibility(R.id.w_stale, View.GONE);
            }
            v.setOnClickPendingIntent(R.id.w_root, openApp(ctx));
            if (today) {
                v.setTextViewText(R.id.w_water_btn, pending > 0 ? "+" + pending + " ml queued" : "+250 ml");
                v.setViewVisibility(R.id.w_water_btn, bmp != null && fresh ? View.VISIBLE : View.GONE);
                Intent wi = new Intent(ctx, TodayWidget.class).setAction(TodayWidget.ACTION_WATER);
                v.setOnClickPendingIntent(R.id.w_water_btn, PendingIntent.getBroadcast(ctx, 7, wi, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            m.updateAppWidget(id, v);
        }
    }
}
