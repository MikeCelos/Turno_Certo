package com.turnocerto.model;

public record CategoryRates(int normal, int firstExtra, int nextExtra) {
    public CategoryRates {
        if (normal < 0 || firstExtra < 0 || nextExtra < 0) {
            throw new IllegalArgumentException("Coeficientes devem ser não-negativos.");
        }
    }
}
