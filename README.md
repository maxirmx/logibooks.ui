# Logibooks UI

[![CI workflow](https://github.com/maxirmx/logibooks.ui/actions/workflows/ci.yml/badge.svg)](https://github.com/maxirmx/logibooks.ui/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/maxirmx/logibooks.ui/branch/main/graph/badge.svg)](https://codecov.io/gh/maxirmx/logibooks.ui)

## Run with Docker

Build the image and start a container using the provided `Dockerfile`:

```bash
docker build -t logibooks-ui .
docker run --rm -p 8080:80 logibooks-ui
```

The container serves the compiled application through nginx and includes the custom error pages from `config/public`.
