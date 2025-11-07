import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

interface EmbedContentProps {
  embedCode: string;
}

export default function EmbedContent({ embedCode }: EmbedContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !embedCode) return;

    // Clear previous content
    containerRef.current.innerHTML = '';
    
    // Special handling for walls.io - load script directly without sanitization
    if (embedCode.includes('walls.io') && embedCode.includes('cdn.walls.io')) {
      console.log('Processing walls.io embed directly');
      
      // Parse the script tag to extract attributes
      const scriptMatch = embedCode.match(/<script[^>]*>/);
      if (scriptMatch) {
        const scriptTag = scriptMatch[0];
        const srcMatch = scriptTag.match(/src="([^"]+)"/);
        const dataWallUrlMatch = scriptTag.match(/data-wallurl="([^"]+)"/);
        const dataTitleMatch = scriptTag.match(/data-title="([^"]+)"/);
        const dataWidthMatch = scriptTag.match(/data-width="([^"]+)"/);
        const dataAutoheightMatch = scriptTag.match(/data-autoheight="([^"]+)"/);
        const dataHeightMatch = scriptTag.match(/data-height="([^"]+)"/);
        const dataLazyloadMatch = scriptTag.match(/data-lazyload="([^"]+)"/);
        const allowMatch = scriptTag.match(/allow="([^"]+)"/);
        
        if (srcMatch) {
          const script = document.createElement('script');
          script.src = srcMatch[1];
          script.async = true;
          
          // Add all data attributes
          if (dataWallUrlMatch) script.setAttribute('data-wallurl', dataWallUrlMatch[1]);
          if (dataTitleMatch) script.setAttribute('data-title', dataTitleMatch[1]);
          if (dataWidthMatch) script.setAttribute('data-width', dataWidthMatch[1]);
          if (dataAutoheightMatch) script.setAttribute('data-autoheight', dataAutoheightMatch[1]);
          if (dataHeightMatch) script.setAttribute('data-height', dataHeightMatch[1]);
          if (dataLazyloadMatch) script.setAttribute('data-lazyload', dataLazyloadMatch[1]);
          if (allowMatch) script.setAttribute('allow', allowMatch[1]);
          
          console.log('Loading walls.io script with attributes:', {
            src: srcMatch[1],
            'data-wallurl': dataWallUrlMatch?.[1],
            'data-title': dataTitleMatch?.[1]
          });
          
          // Add error handling for script loading
          script.onload = () => {
            console.log('Walls.io script loaded successfully');
          };
          
          script.onerror = (error) => {
            console.error('Failed to load walls.io script:', error);
          };
          
          // Try appending to document head instead of container for walls.io
          document.head.appendChild(script);
          
          // Also create a placeholder div that walls.io might be looking for
          const wallsContainer = document.createElement('div');
          wallsContainer.id = 'wallsio-' + dataTitleMatch?.[1];
          wallsContainer.className = 'wallsio-container';
          containerRef.current.appendChild(wallsContainer);
          
          return;
        }
      }
    }

    // Configure DOMPurify to allow specific trusted tags and attributes for embeds
    const purifyConfig = {
      ALLOWED_TAGS: [
        'div', 'span', 'p', 'br', 'img', 'a', 'iframe', 'script',
        'blockquote', 'cite', 'em', 'strong', 'b', 'i', 'u',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
        'rssapp-wall', // Allow RSS.app custom element
        'juicer-feed', // Allow Juicer.io custom element
        'walls-io-embed' // Allow Walls.io custom element
      ],
      ALLOWED_ATTR: [
        'class', 'id', 'style', 'src', 'href', 'alt', 'title',
        'width', 'height', 'frameborder', 'allowfullscreen',
        'data-*', 'async', 'defer', 'type', 'allow',
        'data-wallurl', 'data-title', 'data-width', 'data-autoheight',
        'data-height', 'data-lazyload'
      ],
      ALLOW_DATA_ATTR: true,
      ADD_TAGS: ['script', 'rssapp-wall', 'juicer-feed', 'walls-io-embed'], // Allow script tags, RSS.app, Juicer.io and Walls.io elements
      ADD_ATTR: ['async', 'defer', 'type']
    };

    // Sanitize the embed code
    const sanitizedHTML = DOMPurify.sanitize(embedCode, purifyConfig);
    console.log('Original embed code:', embedCode);
    console.log('Sanitized HTML:', sanitizedHTML);
    
    // Create a temporary container to parse the sanitized HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitizedHTML;

    // Extract scripts from the embed code
    const scripts = tempDiv.querySelectorAll('script');
    const scriptContents: { src?: string; content?: string; attributes?: Record<string, string> }[] = [];

    scripts.forEach((script) => {
      if (script.src) {
        // Only allow scripts from trusted domains
        const allowedDomains = [
          'embedsocial.com',
          'widget.embedsocial.com',
          'cdn.jsdelivr.net',
          'cdnjs.cloudflare.com',
          'code.jquery.com',
          'ajax.googleapis.com',
          'rss.app',
          'app.rss.com',
          'widget.rss.app',
          'juicer.io',
          'www.juicer.io',
          'walls.io',
          'my.walls.io',
          'widget.walls.io',
          'cdn.walls.io'
        ];
        
        try {
          const scriptUrl = new URL(script.src);
          const isAllowedDomain = allowedDomains.some(domain => 
            scriptUrl.hostname === domain || scriptUrl.hostname.endsWith('.' + domain)
          );
          
          if (isAllowedDomain) {
            console.log('Allowed script from:', scriptUrl.hostname, script.src);
            // Capture all data attributes for walls.io scripts
            const attributes: Record<string, string> = {};
            Array.from(script.attributes).forEach(attr => {
              if (attr.name.startsWith('data-') || attr.name === 'allow') {
                attributes[attr.name] = attr.value;
              }
            });
            scriptContents.push({ src: script.src, attributes });
          } else {
            console.log('Blocked script from:', scriptUrl.hostname, script.src);
          }
        } catch (e) {
          // Invalid URL, skip this script
          console.warn('Invalid script URL:', script.src);
        }
      } else {
        // Allow inline scripts from RSS.app embeds with strict content filtering
        const scriptContent = script.innerHTML || script.textContent || '';
        
        // Only allow inline scripts that appear to be legitimate RSS.app or Juicer.io initialization
        const isRSSAppScript = scriptContent.includes('rss.app') || 
                             scriptContent.includes('RSS.app') ||
                             scriptContent.includes('rssapp');
        
        const isJuicerScript = scriptContent.includes('juicer.io') || 
                              scriptContent.includes('Juicer') ||
                              scriptContent.includes('juicer');
        
        const isWallsScript = scriptContent.includes('walls.io') || 
                             scriptContent.includes('Walls') ||
                             scriptContent.includes('walls');
        
        // Additional safety: reject scripts with dangerous patterns
        const dangerousPatterns = [
          /document\.write/i,
          /eval\s*\(/i,
          /Function\s*\(/i,
          /setTimeout\s*\(\s*["'`]/i,
          /setInterval\s*\(\s*["'`]/i,
          /innerHTML\s*=/i,
          /outerHTML\s*=/i,
          /location\s*=/i,
          /href\s*=/i
        ];
        
        const hasDangerousContent = dangerousPatterns.some(pattern => pattern.test(scriptContent));
        
        if ((isRSSAppScript || isJuicerScript || isWallsScript) && !hasDangerousContent && scriptContent.length < 5000) {
          scriptContents.push({ content: scriptContent });
        }
      }
      script.remove();
    });

    // Add the non-script HTML to the container
    console.log('Setting container HTML:', tempDiv.innerHTML);
    containerRef.current.innerHTML = tempDiv.innerHTML;
    
    // For walls.io, we need to ensure there's a target container
    if (embedCode.includes('walls.io')) {
      // walls.io creates its own container, so we don't need to add extra HTML
      console.log('Walls.io embed detected');
    }

    // Execute scripts from trusted sources
    scriptContents.forEach((scriptInfo) => {
      const newScript = document.createElement('script');
      
      if (scriptInfo.src) {
        newScript.src = scriptInfo.src;
        newScript.async = true;
        
        // Apply saved attributes (especially important for walls.io)
        if (scriptInfo.attributes) {
          Object.entries(scriptInfo.attributes).forEach(([key, value]) => {
            newScript.setAttribute(key, value);
          });
        }
        
        // Remove crossOrigin for Juicer.io and Walls.io scripts as it might cause CORS issues
        if (!scriptInfo.src.includes('juicer.io') && !scriptInfo.src.includes('walls.io')) {
          newScript.crossOrigin = 'anonymous';
        }
        console.log('Loading external script:', scriptInfo.src, 'with attributes:', scriptInfo.attributes);
      } else if (scriptInfo.content) {
        // Create inline script with trusted content
        newScript.textContent = scriptInfo.content;
        console.log('Executing inline script');
      }
      
      // Add script to the container
      containerRef.current?.appendChild(newScript);
    });

    // Cleanup function
    return () => {
      if (containerRef.current) {
        // Remove all scripts when component unmounts
        const scripts = containerRef.current.querySelectorAll('script');
        scripts.forEach(script => script.remove());
      }
      
      // Also clean up walls.io scripts from document head
      const wallsScripts = document.head.querySelectorAll('script[src*="walls.io"]');
      wallsScripts.forEach(script => script.remove());
    };
  }, [embedCode]);

  return (
    <div ref={containerRef} className="embed-container relative z-10 min-h-[400px]">
      {/* Juicer.io often needs a specific container */}
      {embedCode.includes('juicer.io') && (
        <ul className="juicer-feed" data-feed-id="alzheimers" data-per="3"></ul>
      )}
      {/* Walls.io needs a container with specific id */}
      {embedCode.includes('walls.io') && (
        <div id="walls-io-embed" className="walls-io-container"></div>
      )}
    </div>
  );
}