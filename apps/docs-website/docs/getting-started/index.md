# Getting Started

Below we list some core concepts of Loon and how to get started visualizing your data.

## Loon Variations

There are two distinct versions of Loon which will be supported. The standard Loon and **Local Loon**. Local Loon comes with all the features that the standard Loon supports except for data upload. Local Loon instead runs a simple server from a specified volume path where your data is already expected to reside in the correct format. This is especially useful for users that do not need the data processing features and subsequent long wait times to process large amounts of data.

## Installing and Running Loon

There are two ways you can choose to run Loon: using the official Docker images or building from the source.

### Official Images

If you're looking for the quickest way to get started with Loon, we suggest using one of the official Docker images. Each of these images initializes a Docker container with some basic configurations and then starts each service within that container. While there is minimal configuration that is supported for these images, it is great for most use cases. Please see [here](./loon-wrappers) for information on the official images.

### Building From Source

If you require more custom configuration for your Loon application, consider building the Docker images from source. Unlike the official images, there is no need for a single wrapper image around the multi-container application. Instead, we leverage Docker Compose to create each container. While more technically challenging, building from source allows for more custom configuration and has a robust set of logs for debugging. See [here](./building-loon) for more information.

import DocCardList from '@theme/DocCardList';

<DocCardList />
