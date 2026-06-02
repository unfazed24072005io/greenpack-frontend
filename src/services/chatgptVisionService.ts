// src/services/openaiVisionService.ts
import OpenAI from 'openai';

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: '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',
  dangerouslyAllowBrowser: true
});

export const openaiVisionService = {
  async analyzeDifferences(masterBase64: string, scanBase64: string): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a label inspection expert. Compare the master label (first image) and printed sample (second image).
            
Return ONLY valid JSON:
{
  "differences": [
    {
      "x": number (0-100 percent from left),
      "y": number (0-100 percent from top),
      "width": number (percent),
      "height": number (percent),
      "type": "color" | "text" | "missing" | "extra" | "position",
      "severity": "high" | "medium" | "low",
      "description": "short description"
    }
  ],
  "difference_count": number,
  "overall_similarity": number (0-100)
}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Master label:" },
              { type: "image_url", image_url: { url: masterBase64, detail: "high" } },
              { type: "text", text: "Printed sample:" },
              { type: "image_url", image_url: { url: scanBase64, detail: "high" } }
            ]
          }
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      console.log('✅ OpenAI analysis:', result);
      return result;

    } catch (error) {
      console.error('OpenAI error:', error);
      return null;
    }
  }
};

// Updated generateDiffImage function
const generateDiffImage = async (masterBase64: string, scanBase64: string): Promise<string> => {
  // Try OpenAI first
  try {
    console.log('🤖 Analyzing with OpenAI Vision...');
    const analysis = await openaiVisionService.analyzeDifferences(masterBase64, scanBase64);
    
    if (analysis && analysis.differences) {
      console.log(`✨ Found ${analysis.differences.length} differences`);
      setDifferenceCount(analysis.differences.length);
      return drawOpenAIDiff(scanBase64, analysis.differences);
    }
  } catch (err) {
    console.warn('OpenAI failed, using fallback:', err);
  }
  
  // Fallback to grid method
  return generateGridDiff(masterBase64, scanBase64);
};

// Draw OpenAI detected differences
const drawOpenAIDiff = (baseImage: string, differences: any[]): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(baseImage);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      for (const diff of differences) {
        const x = (diff.x / 100) * img.width;
        const y = (diff.y / 100) * img.height;
        const w = (diff.width / 100) * img.width;
        const h = (diff.height / 100) * img.height;
        
        // Highlight with color based on severity
        let color = diff.severity === 'high' ? 'rgba(255,0,0,0.3)' :
                    diff.severity === 'medium' ? 'rgba(255,165,0,0.3)' :
                    'rgba(255,255,0,0.3)';
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, w, h);
        
        // Label
        ctx.font = '10px Arial';
        ctx.fillStyle = '#FF0000';
        ctx.fillText(diff.type, x + 5, y + 15);
      }
      
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = baseImage;
  });
};