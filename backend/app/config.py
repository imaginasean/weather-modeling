from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    nws_base_url: str = "https://api.weather.gov"
    cache_ttl_seconds: int = 300  # 5 min for NWS data
    request_timeout_seconds: float = 15.0

    class Config:
        env_prefix = "APP_"


settings = Settings()
