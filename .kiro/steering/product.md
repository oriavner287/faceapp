# Face Video Search Application

A full-stack application that enables users to search for videos based on facial recognition technology. Users can upload images containing faces, and the system will search through video content to find matching faces with configurable similarity thresholds.

## Core Features

- **Face Detection & Recognition**: Upload images to detect faces and generate embeddings
- **Video Search**: Search through video content using facial embeddings
- **Similarity Matching**: Configurable threshold-based matching with confidence scores
- **Session Management**: Persistent search sessions with results caching
- **Multi-site Support**: Fetch and process videos from multiple configured websites

## Key Use Cases

- Finding specific people in video content
- Content moderation and identification
- Media asset management and search
- Security and surveillance applications

## Technical Approach

The application uses face-api.js for face detection and recognition, generating numerical embeddings that represent facial features. These embeddings are compared against faces detected in video content to find matches above a specified similarity threshold.
