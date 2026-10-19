package app.habitsync.hunter;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import org.json.JSONObject;

/** Lets the web app draw the home-screen widgets: it asks which widgets exist and how big they are, then sends one picture for each. */
@CapacitorPlugin(name = "HabitWidget")
public class HabitWidgetPlugin extends Plugin {

    /** Which widgets are on the home screen, with their size in dp, so the pictures fit exactly. */
    @PluginMethod
    public void sizes(PluginCall call) {
        try {
            Context ctx = getContext();
            AppWidgetManager m = AppWidgetManager.getInstance(ctx);
            JSArray list = new JSArray();
            String[] kinds = {WidgetData.KIND_STREAK, WidgetData.KIND_WEEK, WidgetData.KIND_TODAY};
            for (String kind : kinds) {
                for (int id : WidgetData.ids(ctx, m, kind)) {
                    int[] s = WidgetData.sizeOf(m, id, kind);
                    JSObject o = new JSObject();
                    o.put("id", id);
                    o.put("kind", kind);
                    o.put("w", s[0]);
                    o.put("h", s[1]);
                    list.put(o);
                }
            }
            JSObject r = new JSObject();
            r.put("widgets", list);
            r.put("density", ctx.getResources().getDisplayMetrics().density);
            call.resolve(r);
        } catch (Throwable t) {
            // a widget problem must never take the app down
            call.reject(String.valueOf(t));
        }
    }

    /** Stores the pictures (PNG, base64) and which day they belong to, then redraws the widgets. */
    @PluginMethod
    public void update(PluginCall call) {
        try {
            Context ctx = getContext();
            SharedPreferences.Editor e = WidgetData.sp(ctx).edit();
            e.putString("day", call.getString("day", ""));
            e.putInt("dayStart", call.getInt("dayStart", 3));
            e.apply();
            JSArray images = call.getArray("images");
            if (images != null) {
                for (int i = 0; i < images.length(); i++) {
                    try {
                        JSONObject o = images.getJSONObject(i);
                        byte[] png = Base64.decode(o.getString("png"), Base64.DEFAULT);
                        File f = WidgetData.imgFile(ctx, o.getInt("id"));
                        // written beside the real file and moved into place, so a redraw never reads half a picture
                        File tmp = new File(f.getPath() + ".tmp");
                        try (FileOutputStream out = new FileOutputStream(tmp)) {
                            out.write(png);
                        }
                        if (!tmp.renameTo(f)) {
                            tmp.delete();
                        }
                    } catch (Exception ex) {
                        // one bad picture must not stop the others
                    }
                }
            }
            WidgetData.updateAll(ctx);
            call.resolve();
        } catch (Throwable t) {
            call.reject(String.valueOf(t));
        }
    }

    /** Water poured from a widget while the app was closed. Returned once, then cleared. */
    @PluginMethod
    public void consume(PluginCall call) {
        try {
            int ml = WidgetData.takeWater(getContext());
            if (ml != 0) {
                WidgetData.updateAll(getContext());
            }
            JSObject r = new JSObject();
            r.put("water", ml);
            call.resolve(r);
        } catch (Throwable t) {
            call.reject(String.valueOf(t));
        }
    }
}
