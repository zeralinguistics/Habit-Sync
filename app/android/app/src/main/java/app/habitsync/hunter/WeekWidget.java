package app.habitsync.hunter;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;

/** The slim widget: the flame, the streak and the last seven days as round dots. */
public class WeekWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) {
        WidgetData.apply(ctx, m, ids, WidgetData.KIND_WEEK);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager m, int id, Bundle o) {
        WidgetData.apply(ctx, m, new int[] {id}, WidgetData.KIND_WEEK);
    }

    @Override
    public void onDeleted(Context ctx, int[] ids) {
        for (int id : ids) WidgetData.imgFile(ctx, id).delete();
    }
}
