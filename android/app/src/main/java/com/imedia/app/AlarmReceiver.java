package com.imedia.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String soundUrl = intent.getStringExtra("soundUrl");
        Intent i = new Intent(context, AlarmActivity.class);
        i.putExtra("soundUrl", soundUrl);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(i);
    }
}
