package app.habitsync.hunter;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;

/** The small widget: the flame, the streak and whether today is lit. */
public class StreakWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) {
        WidgetData.apply(ctx, m, ids, WidgetData.KIND_STREAK);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager m, int id, Bundle o) {
        WidgetData.apply(ctx, m, new int[] {id}, WidgetData.KIND_STREAK);
    }

    @Override
    public void onDeleted(Context ctx, int[] ids) {
        for (int id : ids) WidgetData.imgFile(ctx, id).delete();
    }
}
