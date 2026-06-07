package com.imedia.app;

import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;

import androidx.appcompat.app.AppCompatActivity;

public class AlarmActivity extends AppCompatActivity {
    private MediaPlayer mediaPlayer;
    private boolean prepared = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_alarm);

        String soundUrl = getIntent().getStringExtra("soundUrl");
        Button dismiss = findViewById(R.id.dismiss_button);
        dismiss.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                stopSound();
                finish();
            }
        });

        playSound(soundUrl);
    }

    private void playSound(String url) {
        try {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build());

            String u = (url == null ? "" : url.trim());
            if (u.isEmpty() || u.equalsIgnoreCase("SYSTEM_ALARM")) {
                Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                mediaPlayer.setDataSource(this, uri);
            } else if (u.equalsIgnoreCase("SYSTEM_NOTIFICATION")) {
                Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                mediaPlayer.setDataSource(this, uri);
            } else if (u.equalsIgnoreCase("SYSTEM_RINGTONE")) {
                Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                mediaPlayer.setDataSource(this, uri);
            } else {
                mediaPlayer.setDataSource(u);
            }

            mediaPlayer.setLooping(true);
            mediaPlayer.setOnPreparedListener(mp -> {
                prepared = true;
                try { mp.start(); } catch (Exception ignored) { }
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                stopSound();
                finish();
                return true;
            });
            mediaPlayer.prepareAsync();
        } catch (Exception ignored) {
            stopSound();
        }
    }

    private void stopSound() {
        if (mediaPlayer != null) {
            try {
                if (prepared) {
                    mediaPlayer.stop();
                }
            } catch (Exception ignored) {
            }
            try { mediaPlayer.release(); } catch (Exception ignored) { }
            mediaPlayer = null;
            prepared = false;
        }
    }

    @Override
    protected void onDestroy() {
        stopSound();
        super.onDestroy();
    }
}
