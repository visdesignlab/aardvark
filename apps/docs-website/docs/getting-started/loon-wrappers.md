---
sidebar_position: 1
---

# Official Loon Docker Images

We support two official docker images for Loon -- a standard Loon version and a Local Loon version. Each of these images have Docker installed inside them and subsequently build the entire application for you. You can find the most up-to-date images below.

## Local Loon Image

To run this image, you will need to specify the location of your Docker socket to mount, the path where your data is currently located, and an additional environment variable.

Image source: https://hub.docker.com/r/bbollen23/local-loon

All Versions: https://hub.docker.com/r/bbollen23/local-loon/tags

### Volumes

| Volumes           | Source                                                              | Destination          | Details                                                 |
| ----------------- | ------------------------------------------------------------------- | -------------------- | ------------------------------------------------------- |
| Docker Volume     | Mac and Linux: /var/run/docker.sock, Windows: //var/run/docker.sock | /var/run/docker.sock | This is required for to start nested docker containers. |
| Local Data Volume | Absolute path to your data                                          | /app/data            | Location of where your data lives.                      |

### Environment Variables

| Environment Variable | Key                                    | Value                      | Details                                                 |
| -------------------- | -------------------------------------- | -------------------------- | ------------------------------------------------------- |
| Local Data Volume    | LOCALDATASETTINGS_SOURCEVOLUMELOCATION | Absolute path to your data | This will be identical to your Data Volume source path. |

## Standard Loon Image

To run this image, you will need to specify the location of your Docker socket to mount, the path where you would like your data to be uploaded, and an additional environment variable.

Image source: https://hub.docker.com/r/bbollen23/loon

All Versions: https://hub.docker.com/r/bbollen23/loon/tags

### Volumes

| Volumes           | Source                                                              | Destination          | Details                                                 |
| ----------------- | ------------------------------------------------------------------- | -------------------- | ------------------------------------------------------- |
| Docker Volume     | Mac and Linux: /var/run/docker.sock, Windows: //var/run/docker.sock | /var/run/docker.sock | This is required for to start nested docker containers. |
| MinIO Data Volume | Absolute path to your data                                          | /app/data            | Location of where your data lives.                      |

### Environment Variables

| Environment Variable | Key                                | Value                      | Details                                                 |
| -------------------- | ---------------------------------- | -------------------------- | ------------------------------------------------------- |
| MinIO Data Volume    | MINIOSETTINGS_SOURCEVOLUMELOCATION | Absolute path to your data | This will be identical to your Data Volume source path. |
