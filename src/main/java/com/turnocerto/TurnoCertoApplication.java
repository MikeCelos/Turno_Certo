package com.turnocerto;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;

import java.awt.Desktop;
import java.net.URI;

@SpringBootApplication
public class TurnoCertoApplication {

    public static void main(String[] args) {
        SpringApplication.run(TurnoCertoApplication.class, args);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady(ApplicationReadyEvent event) {
        Environment env = event.getApplicationContext().getEnvironment();
        String[] activeProfiles = env.getActiveProfiles();
        for (String profile : activeProfiles) {
            if ("test".equalsIgnoreCase(profile)) {
                return;
            }
        }

        boolean openBrowser = Boolean.parseBoolean(env.getProperty("turnocerto.open-browser", "false"));
        if (!openBrowser) {
            openBrowser = Boolean.getBoolean("turnocerto.open-browser");
        }

        if (openBrowser) {
            String port = env.getProperty("server.port", "8080");
            String url = "http://localhost:" + port;
            try {
                if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                    Desktop.getDesktop().browse(new URI(url));
                } else {
                    Runtime.getRuntime().exec(new String[]{"open", url});
                }
            } catch (Exception ignored) {
            }
        }
    }
}
