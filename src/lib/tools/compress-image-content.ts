export const COMPRESS_IMAGE_CONTENT = {
  heroHeading: "Compress Images Online — Without the Guesswork",
  heroSubheading:
    "Upload a JPG, PNG, or WebP and see the file size drop in real time. Drag the quality slider, compare before and after, and download a smaller image — free, no signup.",
  sections: [
    {
      heading: "What this tool does",
      body: `<p>Image Compressor talks to our <code>/api/v1/compress</code> service. Your file is validated, optionally resized, then compressed or converted. The response is the compressed image itself — not a public URL — and stats come back in HTTP headers.</p>
<p>Uploads are processed in temporary storage and deleted afterwards. Nothing is written to a database.</p>`,
    },
    {
      heading: "Formats, quality, and modes",
      body: `<ul>
<li><strong>Input:</strong> JPG, JPEG, PNG, and WebP, up to 10 MB.</li>
<li><strong>Output:</strong> keep the original (<em>auto</em>), or convert to JPEG, PNG, or WebP.</li>
<li><strong>Quality 10–100</strong> is an encoder setting, not a visual-quality percentage.</li>
<li><strong>Modes:</strong> Quality (cleaner), Balanced (default), Maximum (smaller files).</li>
<li><strong>PNG</strong> is optimized losslessly. JPEG and lossy WebP change image data to save bytes.</li>
<li><strong>Transparency</strong> is kept for PNG and WebP. JPEG flattens onto a white background.</li>
</ul>`,
    },
    {
      heading: "Resize and metadata",
      body: `<p>Resize is on by default and fits inside 1920×1920 while keeping aspect ratio. Images are never upscaled. EXIF orientation is applied so phone photos don’t look rotated. Metadata is stripped unless you choose to keep it.</p>`,
    },
    {
      heading: "Fair use",
      body: `<p>The free API allows <strong>3 compressions per minute per IP</strong>. If you hit the limit, wait for the countdown (driven by <code>Retry-After</code>) and try again.</p>
<p>Need a domain for the site that will host these images? <a href="/free-tools/domain-compare">Compare registrar prices</a>.</p>`,
    },
  ],
  faq: [
    {
      question: "Are my images stored?",
      answer:
        "No. Files are validated, processed in temporary storage, returned to you, and deleted. They are never saved to a database or Redis.",
    },
    {
      question: "Will quality 80 look 80% as good as the original?",
      answer:
        "No. Quality is an encoder setting for JPEG and lossy WebP. PNG optimization is lossless. Always preview before you download.",
    },
    {
      question: "Why did JPEG lose transparency?",
      answer:
        "JPEG does not support alpha. Transparent pixels are flattened onto a white background. Use PNG or WebP to keep transparency.",
    },
    {
      question: "What does the 429 error mean?",
      answer:
        "You hit the free rate limit of 3 compressions per IP per 60 seconds. Wait for the retry countdown, then compress again.",
    },
  ],
};
