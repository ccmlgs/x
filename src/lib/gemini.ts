import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const HANDBOOK_CONTEXT = `
Bina Bangsa School Progressive Discipline Policy:
- Level 1: Minor offenses (Late, uniform, etc.) -> 1-5 demerits, Warning / Teacher cleanup.
- Level 2: Repeated minor or moderate (Disruption, plagiarism) -> 10-20 demerits, Detention, Parent notification.
- Level 3: Serious (Bullying, vandalism, fighting) -> 30-50+ demerits, Suspension, Parent-Teacher-Admin meeting.
- Goal: Restorative justice and behavioral correction.
`;

export async function getRecommendations(offense: string, description: string, studentHistory: string) {
  const prompt = `
    Using the school's handbook context:
    ${HANDBOOK_CONTEXT}

    Student Incident:
    Offense Type: ${offense}
    Description: ${description}
    Student History Snippet: ${studentHistory}

    Recommend a specific action based on the progressive demerit system. 
    Be firm but restorative. Mention specific steps like counseling, community service, or formal meetings if appropriate.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert school discipline counselor. Provide fair, restorative, and effective recommendations for student behavior issues.",
      },
    });

    return response.text?.trim() || "No recommendation generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating recommendation.";
  }
}

export async function getPerformanceSummary(records: any[]) {
  const prompt = `
    Analyze the following school discipline records and provide a high-level summary of overall school performance/behavioral climate.
    Identify trends, most common offenses, and areas for improvement.
    
    Records: ${JSON.stringify(records)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a school administrator analyzing behavioral trends. Provide a strategic summary of school-wide discipline performance.",
      },
    });

    return response.text?.trim() || "No summary available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating summary.";
  }
}
