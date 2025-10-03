# Dropzone Fix & 5MB Limit Update

## Problems Fixed

1. **Dropzone not working** - Image upload component was broken
2. **Wrong file size limit displayed** - UI showed 10MB instead of 5MB

## Root Causes

### 1. Dropzone Issue

The `ImageUpload` component was using `React.useActionState` and `useFormStatus` from React 19's experimental features, which may not be fully stable or available in all environments. This caused the form submission to fail silently.

**Problematic code:**

```typescript
const [formState, formAction] = React.useActionState(
  async (_prevState: UploadResult | null, formData: FormData) => {
    return await uploadImage(formData)
  },
  null
)
```

### 2. File Size Limit

The `.env` file had `MAX_FILE_SIZE=10485760` (10MB) instead of the correct 5MB limit.

## Solutions

### 1. Fixed Dropzone - Replaced Server Actions with Standard Form Handling

**Changed from:**

- `React.useActionState` (experimental)
- `useFormStatus` (experimental)
- Server action form submission

**Changed to:**

- Standard `useState` for upload state
- Regular form `onSubmit` handler
- Direct async function call to `uploadImage`

**New implementation:**

```typescript
const [isUploading, setIsUploading] = useState(false)
const [uploadError, setUploadError] = useState<string | null>(null)

const handleFormSubmit = useCallback(
  async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!previewState.file || !canUpload) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append("image", previewState.file)

      const result = await uploadImage(formData)

      if (result.success && result.data) {
        onUploadSuccess?.(result.data)
        handleRemoveFile()
      } else if (result.error) {
        setUploadError(result.error.message)
        onUploadError?.(result.error.message)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed"
      setUploadError(errorMessage)
      onUploadError?.(errorMessage)
    } finally {
      setIsUploading(false)
    }
  },
  [
    previewState.file,
    canUpload,
    onUploadSuccess,
    onUploadError,
    handleRemoveFile,
  ]
)
```

### 2. Updated File Size Limits

**Files updated:**

1. **frontend/.env**

   - Changed: `MAX_FILE_SIZE=10485760` → `MAX_FILE_SIZE=5242880`

2. **backend/.env** (created)
   - Set: `MAX_FILE_SIZE=5242880`

## Benefits

### Dropzone Fix

- ✅ More stable - uses standard React patterns
- ✅ Better error handling - explicit try/catch
- ✅ Clearer state management - no hidden server action state
- ✅ Works in all React 19 environments
- ✅ Easier to debug and maintain

### File Size Limit

- ✅ Consistent 5MB limit across frontend and backend
- ✅ UI correctly displays "5MB" to users
- ✅ Prevents confusion about upload limits
- ✅ Aligns with security best practices

## Files Modified

1. **frontend/src/components/ImageUpload.tsx**

   - Removed `React.useActionState` and `useFormStatus`
   - Added standard form submission handler
   - Updated state management
   - Simplified SubmitButton component

2. **frontend/.env**

   - Updated MAX_FILE_SIZE to 5242880 (5MB)

3. **backend/.env** (created)
   - Set MAX_FILE_SIZE to 5242880 (5MB)
   - Added all required environment variables

## Testing

After these fixes:

- ✅ Dropzone accepts file drops
- ✅ Click to select files works
- ✅ File validation works correctly
- ✅ Upload button becomes enabled after validation
- ✅ Upload progress shows correctly
- ✅ Success/error handling works
- ✅ UI displays "5MB" as maximum file size
- ✅ Files over 5MB are rejected with clear error message

## Technical Notes

### Why Avoid Server Actions?

While React Server Actions are a powerful feature, they can be problematic when:

- Using experimental APIs that may change
- Need explicit control over loading states
- Want clear error boundaries
- Debugging form submission issues
- Working with file uploads that need custom handling

### Standard Form Submission Benefits

- More predictable behavior
- Explicit state management
- Better TypeScript support
- Easier to test
- Works in all React environments
- No hidden magic or implicit state

## File Size Limits Reference

| Size          | Bytes      | Use Case                    |
| ------------- | ---------- | --------------------------- |
| 5MB (current) | 5,242,880  | Standard face images        |
| 10MB          | 10,485,760 | High-res images (if needed) |
| 2MB           | 2,097,152  | Mobile-optimized            |
| 50MB (max)    | 52,428,800 | Configuration maximum       |

To change the limit, update `MAX_FILE_SIZE` in both `.env` files and restart the servers.
