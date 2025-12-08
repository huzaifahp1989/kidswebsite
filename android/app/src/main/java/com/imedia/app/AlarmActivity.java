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

            if (url != null) {
                String u = url.trim();
                if (u.equalsIgnoreCase("SYSTEM_ALARM")) {
                    Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
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
            }

            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
        }
    }

    private void stopSound() {
        if (mediaPlayer != null) {
            mediaPlayer.stop();
            mediaPlayer.release();
            mediaPlayer = null;
        }
    }

    @Override
    protected void onDestroy() {
        stopSound();
        super.onDestroy();
    }
}
