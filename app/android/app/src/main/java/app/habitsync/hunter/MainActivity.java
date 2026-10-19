package app.habitsync.hunter;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // the bridge to the home-screen widgets (HabitWidget in the web app)
        registerPlugin(HabitWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
