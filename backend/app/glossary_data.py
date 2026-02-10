"""Glossary entries for tooltips and glossary panel. Phase 1+ terms."""
from __future__ import annotations

GLOSSARY: list[dict[str, str]] = [
    {"term": "forecast", "definition": "A prediction of what the weather will be at a place and time, based on models and recent observations.", "category": "Data & forecast basics"},
    {"term": "observation", "definition": "A real measurement (temperature, wind, etc.) from a sensor or station right now or in the past.", "category": "Data & forecast basics"},
    {"term": "station", "definition": "A fixed location (e.g. airport or buoy) where weather is measured and reported.", "category": "Data & forecast basics"},
    {"term": "dew point", "definition": "The temperature at which air would get saturated and dew forms; higher often means stickier, more humid air.", "category": "Data & forecast basics"},
    {"term": "wind chill", "definition": "\"Feels like\" temperature when wind blows on skin; stronger wind makes cold feel colder.", "category": "Data & forecast basics"},
    {"term": "heat index", "definition": "\"Feels like\" temperature in hot, humid conditions; humidity makes heat feel more intense.", "category": "Data & forecast basics"},
    {"term": "precipitation chance", "definition": "The probability (e.g. 30%) that measurable rain or snow will fall at that location in the given period.", "category": "Data & forecast basics"},
    {"term": "watch vs warning", "definition": "A watch means conditions are possible; a warning means they're happening or imminent—take action.", "category": "Data & forecast basics"},
    {"term": "NDFD", "definition": "National Digital Forecast Database; the NWS's gridded blend of human and model forecasts.", "category": "Data & forecast basics"},
    {"term": "GFS", "definition": "Global Forecast System; NOAA's global weather model that runs every 6 hours.", "category": "Data & forecast basics"},
    {"term": "bias correction", "definition": "Adjusting model output so it matches past observations on average (e.g. if the model is usually 2°F too warm, subtract 2°F).", "category": "Post-processing"},
    {"term": "downscaling", "definition": "Taking coarser model data and refining it to a finer grid or location so local detail is better.", "category": "Post-processing"},
    {"term": "ensemble", "definition": "Many slightly different model runs used together to show a range of possible outcomes instead of one single forecast.", "category": "Post-processing"},
    {"term": "spread", "definition": "How much the ensemble members differ; large spread often means more uncertainty.", "category": "Post-processing"},
    {"term": "percentile", "definition": "A value that a given percent of outcomes fall below (e.g. 90th percentile temperature = warmer than 90% of ensemble members).", "category": "Post-processing"},
    {"term": "raw vs corrected", "definition": "Raw is direct model output; corrected is after bias correction or other post-processing.", "category": "Post-processing"},
    {"term": "advection", "definition": "Something (e.g. temperature or moisture) being carried along by the wind.", "category": "Simple physics"},
    {"term": "diffusion", "definition": "Smoothing or spreading of a quantity (e.g. heat or smoke) from areas of high to low concentration.", "category": "Simple physics"},
    {"term": "sounding", "definition": "A vertical profile of the atmosphere (temperature, humidity, wind vs height) from a balloon or model.", "category": "Simple physics"},
    {"term": "skew-T", "definition": "A standard chart that shows a sounding; used to read stability and moisture with height.", "category": "Simple physics"},
    {"term": "CAPE", "definition": "Convective Available Potential Energy; a measure of how much \"fuel\" the atmosphere has for thunderstorms (higher = more potential).", "category": "Simple physics"},
    {"term": "CIN", "definition": "Convective Inhibition; a \"lid\" that can prevent storms from forming even when CAPE is present.", "category": "Simple physics"},
    {"term": "stability", "definition": "Whether air tends to stay in place (stable) or rise and form clouds/storms (unstable).", "category": "Simple physics"},
    {"term": "parcel", "definition": "A hypothetical blob of air that we track (e.g. lift it and see if it keeps rising) to understand stability.", "category": "Simple physics"},
    {"term": "primitive equations", "definition": "The core physics equations (motion, mass, energy) that full weather models solve to predict the atmosphere.", "category": "NWP concepts"},
    {"term": "pressure level", "definition": "A horizontal slice of the atmosphere at a fixed pressure (e.g. 500 mb), often used instead of height.", "category": "NWP concepts"},
    {"term": "boundary conditions", "definition": "Values at the edges of the model domain, usually from a larger model like GFS, that \"drive\" your run.", "category": "NWP concepts"},
    {"term": "data assimilation", "definition": "Blending new observations into the model's state so the forecast starts from a more accurate picture.", "category": "NWP concepts"},
    {"term": "cross-section", "definition": "A vertical slice through the atmosphere (e.g. along a line) showing how a variable changes with height and distance.", "category": "NWP concepts"},
    {"term": "model run", "definition": "One execution of the numerical model from a start time, producing a forecast over a set period.", "category": "NWP concepts"},
]


def get_glossary_by_category() -> dict[str, list[dict[str, str]]]:
    out: dict[str, list[dict[str, str]]] = {}
    for entry in GLOSSARY:
        cat = entry["category"]
        if cat not in out:
            out[cat] = []
        out[cat].append(entry)
    return out


def get_term(term: str) -> dict[str, str] | None:
    key = term.strip().lower()
    for entry in GLOSSARY:
        if entry["term"].lower() == key:
            return entry
    return None
