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

## Local label printing

See the [operator and workstation acceptance guide](docs/local-label-printing.md).


### Saved box stickers

WBR/WBR-N box lists, edit screens, and monitor views display the saved company sticker (for example, `Стикер РВБ`). The value comes from the box and is independent of the current scan job's history.

The print action fetches `GET /api/boxes/{id}/label?template=WBR_BOX` and submits the server-generated TSPL through the existing QZ Tray configuration. Labels use 58 x 40 mm stock and include the complete QR payload, box number, and current server printing time. Destination and routing areas are blank. Box stickers print manually, one label per action.
