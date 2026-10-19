package app.habitsync.hunter;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

/** The wide widget: the streak, the week, calories, protein, water and the next move, with a +250 ml button. */
public class TodayWidget extends AppWidgetProvider {
    static final String ACTION_WATER = "app.habitsync.hunter.WIDGET_WATER";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) {
        WidgetData.apply(ctx, m, ids, WidgetData.KIND_TODAY);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager m, int id, Bundle o) {
        WidgetData.apply(ctx, m, new int[] {id}, WidgetData.KIND_TODAY);
    }

    @Override
    public void onDeleted(Context ctx, int[] ids) {
        for (int id : ids) WidgetData.imgFile(ctx, id).delete();
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (intent != null && ACTION_WATER.equals(intent.getAction())) {
            // kept until the app next opens, which adds it to the day
            WidgetData.addWater(ctx, 250);
            WidgetData.updateAll(ctx);
        }
    }
}
