FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy pyproject.toml and uv.lock first
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
RUN uv sync --frozen --no-dev

# Copy the rest of the application
COPY . .

# Expose VexCtx default port
EXPOSE 8765

# Run the application
CMD ["uv", "run", "uvicorn", "vexctx.main:app", "--host", "0.0.0.0", "--port", "8765"]
