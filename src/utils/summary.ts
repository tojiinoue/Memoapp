export const summarizeWithGemini = async (text: string, apiKey: string): Promise<string> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: `次の文章を簡潔に要約してください。\n${text}` }],
      },
    ],
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log('Gemini API response:', data);
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '要約に失敗しました';
};