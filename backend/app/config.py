from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    nws_base_url: str = "https://api.weather.gov"
    cache_ttl_seconds: int = 300  # 5 min for NWS data
    cache_sounding_wyoming_ttl_seconds: int = 21600  # 6 h (observed 2x daily)
    cache_sounding_model_ttl_seconds: int = 3600  # 1 h for RAP/HRRR
    request_timeout_seconds: float = 15.0

    class Config:
        env_prefix = "APP_"


settings = Settings()
