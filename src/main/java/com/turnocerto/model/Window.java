package com.turnocerto.model;

import java.util.Objects;

public record Window(int fromMinute, String category) {
    public Window {
        Objects.requireNonNull(category, "Categoria não pode ser nula");
        if (fromMinute < 0 || fromMinute >= 1440) {
            throw new IllegalArgumentException("Minuto fora do intervalo permitido [0, 1439]: " + fromMinute);
        }
    }
}
