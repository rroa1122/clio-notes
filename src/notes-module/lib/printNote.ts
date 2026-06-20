export const buildPrintCss = (): string => `
    @page {
        size: letter;
        margin: 10mm;
    }

    * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #1a202c;
        line-height: 1.5;
    }

    /* Standard Utilities for Print Hub */
    .no-print { display: none !important; }
    #note-print-root {
        width: 100% !important;
    }

    .document-page, .document-canvas-wrapper {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
    }

    .signature-container img {
        mix-blend-multiply: multiply !important;
    }
`;

export const buildPrintHtml = (options: {
    title: string;
    contentHtml: string;
}): string => {
    const { title, contentHtml } = options;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${title}</title>
        <style>${buildPrintCss()}</style>
    </head>
    <body>
        <div id="note-print-root">
            ${contentHtml}
        </div>
    </body>
    </html>
    `;
};

export const printNoteViaIframe = async (options: {
    title: string;
    contentHtml: string;
}): Promise<void> => {
    const { title, contentHtml } = options;

    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
        position: 'fixed',
        left: '-9999px',
        top: '0',
        width: '1px',
        height: '1px',
        border: 'none',
        opacity: '0',
        pointerEvents: 'none'
    });

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error('Failed to access Print Sandbox window.');

    const html = buildPrintHtml({ title, contentHtml });
    doc.open();
    doc.write(html);
    doc.close();

    await new Promise<void>((resolve) => {
        const check = async () => {
            if (doc.readyState === 'complete') {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => resolve());
                });
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });

    try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
    } catch (e) {
        console.error('Print trigger failed within Sandbox:', e);
    }

    const cleanup = () => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    };

    iframe.contentWindow?.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 30000);
};
