---
sidebar_position: 1
---

# Loon Variations

There are two distinct versions of Loon which will be supported. The standard Loon and **Local Loon**. Local Loon comes with all the features that the standard Loon supports except for data upload. Local Loon instead runs a simple server from a specified volume path where your data is already expected to reside. This is especially useful for users that do not need the data processing features and subsequent long wait times to process large amounts of data.

# Loon Docker Images

We support two official docker images for Loon -- a standard Loon version and a Local Loon version. Each of these images have Docker installed inside them and subsequently build the entire application for you. You can find the most up-to-date images below.

## Standard Loon Image

To run this image, you will need to specify the location of your Docker socket to mount, the path where you would like your data to be uploaded, and an additional environment variable.

### Volumes

| Volumes           | Source                                                              | Destination          | Details                                                 |
| ----------------- | ------------------------------------------------------------------- | -------------------- | ------------------------------------------------------- |
| Docker Volume     | Mac and Linux: /var/run/docker.sock, Windows: //var/run/docker.sock | /var/run/docker.sock | This is required for to start nested docker containers. |
| MinIO Data Volume | Absolute path to your data                                          | /app/data            | Location of where your data lives.                      |

### Environment Variables

| Environment Variable | Key                                | Value                      | Details                                                 |
| -------------------- | ---------------------------------- | -------------------------- | ------------------------------------------------------- |
| MinIO Data Volume    | MINIOSETTINGS_SOURCEVOLUMELOCATION | Absolute path to your data | This will be identical to your Data Volume source path. |

## Local Loon Image

To run this image, you will need to specify the location of your Docker socket to mount, the path where your data is currently located, and an additional environment variable.

### Volumes

| Volumes           | Source                                                              | Destination          | Details                                                 |
| ----------------- | ------------------------------------------------------------------- | -------------------- | ------------------------------------------------------- |
| Docker Volume     | Mac and Linux: /var/run/docker.sock, Windows: //var/run/docker.sock | /var/run/docker.sock | This is required for to start nested docker containers. |
| Local Data Volume | Absolute path to your data                                          | /app/data            | Location of where your data lives.                      |

### Environment Variables

| Environment Variable | Key                                | Value                      | Details                                                 |
| -------------------- | ---------------------------------- | -------------------------- | ------------------------------------------------------- |
| Local Data Volume    | LOCALSETTINGS_SOURCEVOLUMELOCATION | Absolute path to your data | This will be identical to your Data Volume source path. |

# Building and Running Loon From Source

The official Github repository for Loon has everything that is required to build the the docker any of the above docker images. Instead of building a single image, however, you can also use Docker Compose to build our multi-container application. Building the multi-container application instead of the single Docker image provides more insight when attempting to debug and allows for much more configuration. This is done through a build script with an accompanying JSON file.

## Configuration File
