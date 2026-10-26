"""Calamity Watch model service.

Stage one: hazard relevance and hazard type (trained here on HumAID).
Stage two: emotion (fear, anger, sadness, ...) and sentiment from Cardiff NLP models.
Geoparsing: spaCy named entities resolved against a GeoNames gazetteer.
"""
