# Implementation Plan

- [x] 1. Set up Next.js 15+ project structure with TypeScript and security-focused dependencies

  - Initialize Next.js 15+ project with App Router and TypeScript strict configuration
  - **Security**: Configure TypeScript with strict mode and security-focused linting rules
  - Install and configure Tailwind CSS for styling with Content Security Policy considerations
  - Initialize and configure shadcn/ui component library with accessibility and security features
  - Set up secure project directory structure for components, services, and API routes
  - **Security**: Organize directories to separate client and server code, prevent sensitive data exposure
  - Install core dependencies: React Dropzone (with security validation), Sharp (for secure image processing), face-api.js
  - **Security**: Audit all dependencies for known vulnerabilities and configure secure defaults
  - _Requirements: 1.1, 1.3_
  - _Steering: Follow tech.md for Next.js 15 App Router configuration, security-expert.md for secure setup, structure.md for organization_

- [x] 2. Configure oRPC with Hono for secure type-safe backend services

  - Install and configure oRPC and Hono packages with security middleware
  - **Security**: Configure Hono with security headers (HTTPS, CSP, X-Frame-Options, X-Content-Type-Options)
  - Set up base oRPC router structure with Hono provider and input validation middleware
  - **Security**: Implement rate limiting middleware and request validation at the router level
  - Create TypeScript interfaces for API contracts and data models with security validation
  - **Security**: Define error types that never expose internal system information
  - Configure development and build scripts for oRPC integration with security checks
  - **Security**: Add security linting and vulnerability scanning to build process
  - _Requirements: 2.2, 4.2_
  - _Steering: Follow tech.md for oRPC configuration, security-expert.md for API security, backend-expert.md for service patterns_

- [x] 3. Implement secure core data models and TypeScript interfaces with privacy protection

  - Create VideoMatch, FaceDetection, and SearchSession interfaces with privacy-focused design
  - **Security**: Ensure biometric data interfaces include encryption fields and access logging
  - Implement comprehensive validation schemas for API requests and responses using Zod
  - **Security**: Add input sanitization and validation rules to prevent injection attacks
  - Set up secure error handling types and response formats that never expose internal details
  - **Security**: Define sanitized error types that map internal errors to safe user messages
  - Create utility types for face embeddings and similarity scores with encryption support
  - **Privacy**: Include automatic cleanup timestamps and GDPR compliance fields in data models
  - **Security**: Add audit trail interfaces for tracking biometric data access and processing
  - _Requirements: 2.2, 4.2, 7.1, 6.6_
  - _Steering: Follow tech.md for Zod validation, security-expert.md for biometric data protection, backend-expert.md for interfaces_

- [x] 4. Build secure image upload server action with comprehensive security validation

  - Create server action for multipart file upload handling using Next.js 15+ server actions
  - **Security**: Implement comprehensive file validation (MIME type verification, magic number checking, size limits)
  - **Security**: Add malicious file detection and virus scanning before processing
  - Implement strict file validation (type, size, format) with sanitized error messages
  - **Security**: Validate file headers and content to prevent malicious uploads (polyglot files, embedded scripts)
  - Set up secure temporary file storage with automatic cleanup mechanisms and proper permissions
  - **Security**: Use secure temporary directories with restricted access and automatic purging
  - Add image preprocessing and validation before face detection with security checks
  - **Security**: Sanitize image metadata and strip potentially dangerous EXIF data
  - **Privacy**: Implement immediate cleanup of uploaded files after processing completion
  - _Requirements: 1.1, 1.2, 1.4, 6.1, 7.1, 7.6_
  - _Steering: Follow frontend-expert.md for server actions, security-expert.md for file upload security, tech.md for Next.js 15_

- [x] 5. Implement secure face detection and embedding generation service with biometric data protection

  - Set up face-api.js with pre-trained models for face detection and secure model loading
  - **Security**: Validate and verify integrity of ML models before loading to prevent model poisoning
  - Create face detection service with comprehensive error handling for no faces detected
  - **Security**: Implement sanitized error messages that never expose internal processing details
  - Implement secure embedding generation from detected faces with encryption
  - **Privacy**: Encrypt face embeddings immediately after generation using strong encryption
  - **Security**: Add input validation to prevent adversarial attacks on face detection models
  - Add support for multiple face detection with largest face selection and privacy protection
  - **Privacy**: Implement automatic cleanup of intermediate face detection data
  - **Security**: Add rate limiting to prevent abuse of face detection endpoints
  - **Audit**: Log all face detection operations for GDPR compliance and security monitoring
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.2, 6.1, 6.6_
  - _Steering: Follow backend-expert.md for service patterns, security-expert.md for biometric protection, tech.md for face-api.js_

- [x] 6. Create secure oRPC router for face processing operations with comprehensive validation

  - Implement faceRouter.processImage() with type-safe parameters and comprehensive input validation
  - **Security**: Add Zod schema validation for all inputs to prevent injection attacks
  - **Security**: Implement authentication and session validation before processing biometric data
  - Add face detection and embedding generation to oRPC layer with security middleware
  - **Security**: Add rate limiting specifically for face processing endpoints to prevent abuse
  - Create comprehensive error handling for face processing failures with sanitized responses
  - **Security**: Ensure error responses never expose internal system details or biometric data
  - Implement secure session management for temporary data storage with encryption
  - **Privacy**: Add automatic session expiration and cleanup mechanisms for biometric data
  - **Security**: Implement access logging and audit trails for all face processing operations
  - **Privacy**: Verify that all temporary biometric data is properly cleaned up after processing
  - _Requirements: 2.1, 2.2, 2.5, 6.3, 6.6_
  - _Steering: Follow tech.md for oRPC configuration, security-expert.md for API security, backend-expert.md for router patterns_

- [x] 7. Build secure video fetching and scraping service with URL validation and content filtering

  - Create video fetching service for the three hard-coded URLs with comprehensive validation
  - **Security**: Implement URL validation and sanitization to prevent SSRF attacks
  - **Security**: Validate that URLs point to expected domains and reject suspicious requests
  - Implement web scraping with Puppeteer or Cheerio for video metadata with security configurations
  - **Security**: Configure Puppeteer with security settings (disable JavaScript execution, restrict network access)
  - **Security**: Implement content filtering to prevent fetching of malicious or inappropriate content
  - Add secure thumbnail extraction and download functionality with validation
  - **Security**: Validate downloaded content types and scan for malicious content before processing
  - **Security**: Implement secure temporary storage for thumbnails with proper cleanup
  - Implement comprehensive rate limiting and error handling for website requests
  - **Security**: Add exponential backoff and circuit breaker patterns to prevent service abuse
  - **Security**: Implement timeout handling to prevent resource exhaustion attacks
  - Create parallel processing for multiple websites with 10 video limit per site and resource protection
  - **Security**: Limit concurrent requests and implement resource usage monitoring
  - **Security**: Add request logging and monitoring for suspicious scraping patterns
  - _Requirements: 3.1, 3.2, 3.4, 7.3_
  - _Steering: Follow backend-expert.md for service patterns, security-expert.md for video fetching security, tech.md for Puppeteer_

- [x] 8. Implement secure face detection on video thumbnails with privacy protection

  - Create secure thumbnail processing pipeline for face detection with input validation
  - **Security**: Validate thumbnail image format and content before processing to prevent malicious inputs
  - **Security**: Implement secure image processing with Sharp to prevent image-based attacks
  - Generate encrypted embeddings from faces detected in video thumbnails
  - **Privacy**: Encrypt face embeddings immediately after generation and before any storage
  - **Security**: Add input sanitization to prevent adversarial attacks on face detection
  - Handle cases where no faces are found in thumbnails with secure error responses
  - **Security**: Ensure error messages don't expose internal processing details or file paths
  - Implement secure batch processing for multiple thumbnails with resource limits
  - **Security**: Add memory and CPU usage monitoring to prevent resource exhaustion
  - **Security**: Implement rate limiting on batch processing to prevent abuse
  - Add comprehensive error handling and security logging for thumbnail processing failures
  - **Security**: Log security events (suspicious inputs, processing failures) for monitoring
  - **Privacy**: Implement automatic cleanup of processed thumbnails and intermediate data
  - **Audit**: Log all thumbnail processing operations for compliance and security monitoring
  - _Requirements: 4.1, 4.2, 3.5, 6.1, 6.6_
  - _Steering: Follow backend-expert.md for service patterns, security-expert.md for image processing security, tech.md for Sharp_

- [x] 9. Create secure similarity matching and scoring system with input validation

  - Implement secure cosine similarity calculation between encrypted face embeddings
  - **Security**: Validate embedding inputs to prevent manipulation and ensure data integrity
  - **Privacy**: Perform similarity calculations on encrypted embeddings without exposing raw biometric data
  - Create similarity scoring with configurable threshold (default 0.7) and comprehensive validation
  - **Security**: Validate threshold inputs using Zod schemas to prevent injection attacks
  - **Security**: Ensure threshold values are within safe ranges (0.1-1.0) and reject invalid inputs
  - Build secure result filtering and sorting by similarity score with sanitized outputs
  - **Security**: Sanitize similarity scores before returning to client (round to 2 decimal places)
  - **Privacy**: Ensure no raw embedding data or internal IDs are exposed in results
  - Add support for adjustable similarity thresholds with comprehensive input validation
  - **Security**: Log threshold changes for audit purposes and monitor for suspicious patterns
  - **Security**: Implement rate limiting on similarity calculations to prevent computational abuse
  - **Audit**: Log all similarity matching operations for compliance and security monitoring
  - _Requirements: 4.3, 4.4, 4.5, 8.1, 8.2, 8.6_
  - _Steering: Follow backend-expert.md for service patterns, security-expert.md for biometric data security, tech.md for TypeScript_

- [x] 9.5. Fix Content Security Policy for production deployment

  - **URGENT**: Update CSP configuration to allow connections to production backend URL (`https://faceapp-lhtz.onrender.com`)
  - **Security**: Configure environment-specific CSP directives that allow localhost in development and production URLs in production
  - Locate and update CSP configuration in Next.js config (`next.config.js`) or security middleware
  - **Security**: Ensure CSP `connect-src` directive includes both development (`http://localhost:3001`) and production backend URLs
  - Add environment variable support for dynamic backend URL configuration (e.g., `NEXT_PUBLIC_BACKEND_URL`)
  - **Security**: Validate that CSP changes don't introduce security vulnerabilities by allowing overly broad domains
  - Test CSP configuration in both development and production environments
  - **Security**: Verify that health check endpoints and API calls work correctly with updated CSP
  - Update any hardcoded localhost references to use environment variables for backend URL
  - **Security**: Ensure no sensitive backend URLs are exposed in client-side code
  - _Requirements: 7.4 (production deployment), 8.6 (security configuration)_
  - _Steering: Follow security-expert.md for CSP configuration, tech.md for environment variables, Next.js security headers_

- [x] 10. Create server actions for video search and operations with security validation

  - Create server action for video search with parallel processing of websites following Next.js 15 App Router patterns
  - **Security**: Implement URL validation and sanitization for external video sources following security-expert.md guidelines
  - Implement server action for retrieving search results using oRPC type-safe contracts from `/backend/src/contracts/api.ts`
  - Add server action for threshold adjustment and result filtering with comprehensive Zod validation schemas
  - **Security**: Validate all threshold inputs to prevent injection attacks and ensure values are within safe ranges (0.1-1.0)
  - Implement progress tracking and status updates using React state management patterns from steering guidelines
  - Create type-safe error handling across all server actions with sanitized error messages (no internal details exposed)
  - **Security**: Implement rate limiting on video search endpoints to prevent DoS attacks
  - Follow monorepo structure: backend services in `/backend/src/services/`, frontend actions in `/frontend/src/lib/actions.ts`
  - Use ESM modules and TypeScript strict type checking as specified in tech stack guidelines
  - _Requirements: 3.1, 4.3, 5.2, 8.3, 8.6_
  - _Steering: Follow backend-expert.md for service layer patterns, security-expert.md for input validation, tech.md for oRPC integration_

- [x] 11. Create secure image upload React component with comprehensive validation

  - Build ImageUpload component using function declarations (not arrow functions) following frontend-expert.md patterns
  - **Security**: Implement client-side file validation (MIME type, size limits, format verification) before upload
  - Use shadcn/ui Card and Button components with React Dropzone integration following component structure guidelines
  - **Security**: Configure React Dropzone with strict file type restrictions (JPEG, PNG only) and size limits (max 10MB)
  - Integrate with server action for file upload using useFormState and useFormStatus hooks in proper order
  - Implement comprehensive file validation feedback and error display using shadcn/ui Alert components
  - **Security**: Display sanitized error messages only - never expose internal validation details to users
  - Add secure image preview functionality after upload following performance optimization guidelines
  - Create loading states and progress indicators with server action status using shadcn/ui Spinner components
  - Implement drag-and-drop visual feedback and styling with shadcn/ui components using Tailwind CSS patterns
  - **Security**: Add visual indicators for file security validation status (validated, processing, secure)
  - Follow component organization: place in `/frontend/src/components/` with proper import structure from frontend-expert.md
  - Use event handlers with "handle" prefix (e.g., handleFaceUpload, handleFileValidation, handleSecurityCheck)
  - Implement proper TypeScript interfaces and security-focused constants (MAX_FILE_SIZE, ALLOWED_MIME_TYPES)
  - _Requirements: 1.1, 1.3, 7.1, 7.6_
  - _Steering: Follow frontend-expert.md component patterns, security-expert.md for file upload security, Face Detection & Upload Interface example_

- [ ] 12. Build secure search results display component with privacy protection

  - Create SearchResults component using function declarations following frontend-expert.md component structure
  - **Security**: Ensure no sensitive data (embeddings, internal IDs) is exposed in component props or state
  - Use shadcn/ui Card and Grid components with responsive layout following Tailwind CSS patterns
  - Implement video thumbnail display with metadata using shadcn/ui Card components and proper TypeScript interfaces
  - **Security**: Validate and sanitize all video metadata before display to prevent XSS attacks
  - Add similarity score visualization using shadcn/ui Badge and Progress components with computed/derived values
  - **Security**: Display only sanitized similarity scores (rounded to 2 decimal places, no raw embedding data)
  - Create secure external link handling for video URLs using shadcn/ui Button components with proper validation
  - **Security**: Validate video URLs before opening and add security warnings for external links
  - Implement sorting and filtering controls using shadcn/ui Select and Button components following React hooks order
  - **Security**: Validate all filter inputs and prevent injection attacks through search parameters
  - Consider virtualization for large result sets using react-window patterns from performance optimization guidelines
  - Follow component order: data fetching hooks, logic hooks, React primitive hooks, constants, computed values, event handlers, JSX
  - Use proper module aliases (@/components/ui) and import organization from frontend-expert.md
  - **Privacy**: Implement automatic cleanup of displayed results when component unmounts
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.5_
  - _Steering: Follow frontend-expert.md component patterns, security-expert.md for data sanitization, Virtualized Results Grid example_

- [ ] 13. Implement secure loading and error handling components with sanitized messaging

  - Create LoadingSpinner component using function declarations and shadcn/ui Spinner and Progress components
  - **Security**: Ensure loading states never expose sensitive processing details or internal system information
  - Build error display components using shadcn/ui Alert and Button components with retry functionality following error handling patterns
  - **Security**: Implement comprehensive error message sanitization - never expose stack traces, file paths, or internal errors
  - Implement "No similar person found" messaging using shadcn/ui Alert components with proper accessibility (ARIA labels)
  - Add network error handling with exponential backoff following error boundary patterns from frontend-expert.md
  - **Security**: Sanitize network error messages to prevent information disclosure about internal services
  - Create user-friendly error messages for different failure scenarios using shadcn/ui components and proper TypeScript error types
  - **Security**: Map internal error codes to safe, user-friendly messages without exposing system details
  - Implement FaceSearchErrorBoundary class component following the comprehensive error boundary pattern from steering
  - **Security**: Ensure error boundary never logs or displays sensitive biometric data in error states
  - Use proper error logging and monitoring patterns for production debugging with security event tracking
  - **Security**: Log security-relevant errors (failed uploads, suspicious requests) for monitoring
  - Follow component structure with proper imports, interfaces, constants, and error handling logic
  - **Privacy**: Implement automatic cleanup of error state data when components unmount
  - _Requirements: 7.1, 7.2, 7.4, 7.6, 5.5_
  - _Steering: Follow frontend-expert.md Comprehensive Error Boundary example, security-expert.md for error sanitization, accessibility guidelines_

- [ ] 14. Create main application page with server actions integration

  - Build main page component in `/frontend/src/app/page.tsx` using Next.js 15 App Router patterns
  - Integrate upload and search components using server actions following frontend-expert.md component integration patterns
  - Create server actions for search operations and result retrieval using oRPC type-safe contracts
  - Use server actions for file upload with proper form handling using useFormState and useFormStatus hooks
  - Implement search progress updates using server actions and React state following Video Search Interface patterns
  - Add session management using SessionProvider context from frontend-expert.md Session Management example
  - Create responsive layout with Tailwind CSS styling following design system patterns
  - Use proper component hierarchy: Server Components by default, 'use client' only when necessary
  - Follow App Router structure with nested layouts and proper SEO considerations
  - Implement proper cleanup handling and session management following privacy guidelines
  - _Requirements: 1.1, 5.1, 6.2_
  - _Steering: Follow frontend-expert.md Video Search Interface example, Session Management patterns, Next.js 15 App Router guidelines_

- [ ] 15. Implement privacy and data cleanup mechanisms

  - Create automatic cleanup service in `/backend/src/services/cleanupService.ts` following backend service layer patterns
  - Implement session expiration and data purging using Node.js scheduling and proper error handling
  - Add cleanup on component unmount and page navigation using React useEffect cleanup patterns
  - Create cron job or scheduled cleanup for orphaned files following backend architecture guidelines
  - Ensure no persistent storage of user facial data following privacy-first design principles
  - Use proper TypeScript interfaces for cleanup operations and error handling
  - Follow monorepo structure with backend cleanup services and frontend cleanup hooks
  - Implement proper logging and monitoring for cleanup operations
  - Use ESM modules and follow backend service patterns from steering guidelines
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - _Steering: Follow backend-expert.md service patterns, structure.md for file organization, tech.md for Node.js patterns_

- [ ] 16. Add comprehensive error handling and user feedback

  - Implement specific error messages for different failure types using TypeScript error types and Zod validation
  - Add retry mechanisms for transient failures following exponential backoff patterns from frontend-expert.md
  - Create fallback behaviors for partial website failures using proper error boundary patterns
  - Implement user guidance for image quality issues with clear, accessible messaging using shadcn/ui Alert components
  - Add logging and monitoring for production debugging following backend service patterns
  - Use proper error classification and user-friendly error messages following UX guidelines
  - Implement error reporting service integration for production monitoring
  - Follow error handling patterns from both frontend and backend steering guidelines
  - Use proper TypeScript error types and runtime validation with Zod schemas
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Steering: Follow frontend-expert.md error handling patterns, backend error handling, tech.md for validation schemas_

- [ ] 17. Optimize performance and add production configurations

  - Implement image compression and resizing optimizations using Sharp following backend image processing patterns
  - Add caching for face detection models and thumbnails using proper caching strategies from performance guidelines
  - Configure production build optimizations for both Next.js frontend and Node.js backend following tech.md guidelines
  - Set up environment variables for deployment following monorepo configuration patterns
  - Add monitoring and analytics for production usage using proper logging and monitoring patterns
  - Implement image processing caching using useImageProcessor hook patterns from frontend-expert.md
  - Use virtualization for large result sets following Virtualized Results Grid example
  - Follow performance optimization principles: caching, compression, lazy loading, and proper state management
  - Configure production builds using native TypeScript compiler and proper build scripts from tech.md
  - _Requirements: Performance optimization for all features_
  - _Steering: Follow frontend-expert.md performance patterns, tech.md build configuration, backend optimization guidelines_

- [ ] 18. Create comprehensive test suite for all components and services

  - **Backend Testing**: Write comprehensive unit tests for all services using Jest with ts-jest

    - Test face detection service with various image types, qualities, and edge cases
    - **Security**: Test malicious file uploads, oversized files, and injection attempts on upload service
    - Test similarity matching service with known face pairs and boundary conditions
    - **Security**: Test with malformed embeddings, invalid thresholds, and edge cases
    - Test video fetching service with mock websites and error scenarios
    - Test thumbnail processing with various image formats and security scenarios
    - **Privacy**: Ensure all test data is properly cleaned up and no biometric data persists

  - **Frontend Testing**: Write component tests using Vitest and @testing-library/react

    - Test ImageUpload component with file validation and error handling
    - Test SearchResults component with various result sets and edge cases
    - Test loading and error components with different error scenarios
    - Test main page integration with server actions and state management
    - **Security**: Test component security (no sensitive data exposure, proper error sanitization)

  - **Integration Testing**: Create end-to-end workflow tests

    - Test complete user workflow from image upload to search results
    - Create mock video websites for testing scraping functionality using proper mocking patterns
    - Test authentication and session management flows
    - **Security**: Test authentication bypass attempts, malformed inputs, and rate limiting
    - **Privacy**: Verify that all temporary biometric data is properly cleaned up after processing

  - **Security Testing**: Comprehensive security validation tests

    - Test input validation and sanitization across all endpoints
    - Test rate limiting and DoS protection mechanisms
    - Test file upload security (malicious files, size limits, type validation)
    - Test biometric data encryption and cleanup mechanisms
    - **Audit**: Verify audit logging for all biometric data operations

  - **Performance Testing**: Load and stress testing

    - Test concurrent face detection operations and resource usage
    - Test large file upload handling and memory management
    - Test video scraping performance with multiple concurrent requests
    - Test similarity matching performance with large embedding sets

  - **Test Organization and Configuration**:

    - Organize backend tests in `/backend/src/__tests__/` following current structure
    - Organize frontend tests in `/frontend/src/test/` with proper test utilities
    - Configure Jest for backend with ESM support and security-focused test patterns
    - Configure Vitest for frontend with jsdom environment and component testing
    - Use proper TypeScript in tests and follow ESM module patterns
    - Implement proper mocking patterns for external services and APIs
    - Add test coverage reporting and quality gates

  - _Requirements: All requirements validation and security compliance_
  - _Steering: Follow frontend-expert.md Component Testing example, tech.md for testing configuration, security-expert.md for security testing, structure.md for test organization_
