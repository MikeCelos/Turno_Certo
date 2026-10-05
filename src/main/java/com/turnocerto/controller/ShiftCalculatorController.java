package com.turnocerto.controller;

import com.turnocerto.dto.CalculateRequest;
import com.turnocerto.engine.LisbonTimeUtils;
import com.turnocerto.engine.ShiftEngine;
import com.turnocerto.model.Profile;
import com.turnocerto.model.Shift;
import com.turnocerto.model.ShiftCalculationResult;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ShiftCalculatorController {

    @PostMapping("/calculate")
    public ResponseEntity<ShiftCalculationResult> calculate(@RequestBody CalculateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Pedido inválido.");
        }
        if (request.getHolidays() != null && request.getHolidays().size() > 500) {
            throw new IllegalArgumentException("Lista de feriados inválida.");
        }

        String start = LisbonTimeUtils.lisbonTimestamp(request.getStart(), request.getStartOccurrence());
        String end = LisbonTimeUtils.lisbonTimestamp(request.getEnd(), request.getEndOccurrence());
        long rateCents = LisbonTimeUtils.parseRateCents(request.getRate());

        String extraStart = null;
        if (request.getExtraStart() != null && !request.getExtraStart().trim().isEmpty()) {
            extraStart = LisbonTimeUtils.lisbonTimestamp(request.getExtraStart(), request.getExtraStartOccurrence());
        }

        Long normalRateCents = null;
        if (request.getNormalRate() != null && !request.getNormalRate().trim().isEmpty()) {
            normalRateCents = LisbonTimeUtils.parseRateCents(request.getNormalRate());
        }

        Shift shift = new Shift(start, end, request.getRegime(), request.getWorkType(), rateCents, extraStart, normalRateCents);
        Profile profile = Profile.initialProfile(request.getHolidays());

        ShiftCalculationResult result = ShiftEngine.calculateShift(shift, profile);
        return ResponseEntity.ok(result);
    }
}
