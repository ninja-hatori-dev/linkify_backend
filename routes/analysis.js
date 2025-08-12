const express = require('express');
const axios = require('axios');
const { verifyToken } = require('./auth');
const db = require('../database/db.supabase');

const router = express.Router();

// Perplexity API configuration
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Helper function to call Perplexity API
async function callPerplexityAPI(messages, model = 'sonar-pro') {
  try {
    const response = await axios.post(PERPLEXITY_API_URL, {
      model: model,
      messages: messages,
      
      temperature: 0.2,
      top_p: 0.9,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Perplexity API error:', error.response?.data || error.message);
    throw new Error('LLM analysis failed');
  }
}

// Analyze user's company to get detailed information

// Analyze company to determine key personas to 

router.post('/get_company_data', verifyToken, async (req, res) => {
  try {
    const { linkedin_url } = req.body;
  } catch (error) {
    console.error('Error getting company data:', error);
    res.status(500).json({ error: 'Failed to get company data' });
  }
});

router.post('/comp_analysis', verifyToken, async (req, res) => {
  try {
    console.log('=== STARTING COMPANY PERSONAS ANALYSIS ===');
 
    
    const { linkedin_url, domData , accountDomain } = req.body;
    console.log('Extracted parameters - linkedin_url:', linkedin_url, 'accountDomain:', accountDomain);

    if (!linkedin_url) {
      console.log('ERROR: LinkedIn URL is missing');
      return res.status(400).json({ error: 'LinkedIn URL is required' });
    }

    if (!accountDomain) {
      console.log('ERROR: Account domain is missing');
      return res.status(400).json({ error: 'Account domain is required' });
    }


   if( !domData ){
    console.log("domData is not available");
    return res.status(400).json({ error: 'DOM data is required' });
   }










    //ANALYSIS DATA FOR ACCOUNT COMPANY
    console.log('Step 2: Fetching account company analysis data for domain:', accountDomain);
   
    
    let analysisData = await db.getAccountCompanyAnalysisDataByDomain(accountDomain);
    console.log('Account company analysis data result:', analysisData ? 'Found' : 'Not found');
    
    if (analysisData) {
      console.log('Account company analysis data keys:', Object.keys(analysisData.analysis_data || {}));
    }
    
    //check if the analysis data is non empty
    if (Object.keys(analysisData.analysis_data || {}).length == 0) {
      
      console.log('Step 3: Creating account company analysis data - existing data is empty or missing');

        const acc_messages = [
          {
            role: 'system',
            content: `You are an advanced business analyst integrating deep
             web research, the AURA mental models & ontology, and
              the Heptapod 7-factor analysis model. Use the domain
               name provided as the sole input to return an actionable,
                exhaustively researched briefing for downstream sales
                 prospecting and strategic targeting.**Apply the following
                  frameworks:**  - **AURA Ontology:** Analyze using [Actors, 
                  Use Cases, Resources, Actions, Outcomes, Context]. 
                   - **AURA Mental Models:** Include first-principles, second-order effects, incentives & friction, 
                   narrative advantage.  - **Heptapod 7-Factor Analysis:** Structure competitive/disruption analysis by 
                   Product Coverage & Breadth; Price & Affordability; Performance & Reliability; Integration Ecosystem &
                    Openness; Scalability & Future-readiness; Customer Support & Services; Brand Equity & Positioning.---#
                    
                    ---### OUTPUT FORMAT (use clear headers and lists):#### Company Overview- , 
                    founding year, headquarters, founders/key executives, company size.#### Product/Service Description- Core products/solutions,
                     key differentiators, pricing model.#### Target Verticals & Industries- Active verticals, adjacent/emerging markets.#### B
                     Buyer Personas (with Advanced Role Breakdown)For each persona group, detail:-
                      **Champion**: Advocate for the product internally. Include typical titles, motivations, pain-points (AURA incentives/friction), 
                      influence tactics (narrative advantage).- 
                      **Decision Maker**: Holds final approval. Outline typical decision frameworks, value criteria (first-principles, second-order effects).-
                       **Budget Holder**: Controls/influences spending. Detail incentive structures, common objections, mitigation tactics (AURA, Heptapod Pricing).- 
                       **End User/Implementer**: Handles day-to-day use. Describe adoption challenges, friction points, and outcomes.> For each role,
                        map motivations/dynamics using AURA actors, actions, and outcomes. Explicitly include influence pathways and objections.
                        #### Competitive Analysis- Identify top direct and indirect competitors.- Use Heptapod 7-factor framework 
                        for a detailed comparative analysis of each.#### Use Cases & Solutions- Tie use cases explicitly to AURA’s 
                        Use Cases and Actions categories.- Include novel/emerging use cases per market trends.#### Value Proposition- 
                        Outline specific business outcomes, ROI, cost savings, compliance or productivity gains—mapped to AURA outcomes. I
                        nclude real-world data/testimonials where available.#### Recent News & Developments- Latest funding, partnerships, 
                        product launches (focus on last 12-24 months).#### AURA & Heptapod Insights Summary- Synthesize how AURA & Heptapod models 
                        shape company approach, customer engagement, and differentiation.- Highlight second-order effects, narrative strategies, 
                        and untapped opportunities.##### Output guidelines:- Use clear headers/bullets for readability.- Reference AURA and Heptapod
                         concepts contextually throughout.- Be exhaustive yet concise, sales-ready, and actionable.- Base all claims on up-to-date r
                         esearch, real data, or explicit logical inference `  
            },
          {
            role: 'user',
            content: `Analyze the company with domain "${accountDomain}". Provide information in this exact JSON structure:
            {
              "company_name": "",
              "industry": "",
              "size": "",
              "location": "",
              "description": "",
              "products_services": [],
              "target_markets": [],
              "recent_news": [],
              "key_challenges": [],
              "business_model": "",
              "revenue_model": "",
              "competitors": [],
              "technology_stack": [],
              "growth_stage": "",
              "linkedin_company_url": "",
              "organization_leadership": [],
              "ideal_customer_personas": [
                {
                  "type": "decision_maker",
                  "linkedin_keyword_search": "not more than 3 words, and only the words that will definitely be present in the LinkedIn profile"
                },
                {
                  "type": "champion",
                  "linkedin_keyword_search": "not more than 3 words, and only the words that will definitely be present in the LinkedIn profile"
                },
                {
                  "type": "budget_holder",
                  "linkedin_keyword_search": "not more than 3 words, and only the words that will definitely be present in the LinkedIn profile"
                },
                {
                  "type": "end_user",
                  "linkedin_keyword_search": "not more than 3 words, and only the words that will definitely be present in the LinkedIn profile"
                },
                {
                  "type": "influencer",
                  "linkedin_keyword_search": "not more than 3 words, and only the words that will definitely be present in the LinkedIn profile"
                }
              ],
              "use_cases": ""
            }`
          }
        ];
    
        console.log('Step 3.2: Calling Perplexity API for account company analysis');
        const acc_llmResponse = await callPerplexityAPI(acc_messages);
        console.log('Step 3.3: Received LLM response for account company analysis');
        
        // Parse the JSON response
        console.log('Step 3.4: Parsing LLM response for account company analysis');
        let acc_companyInfo = {};
        const content = acc_llmResponse.choices[0].message.content;
        console.log('Raw LLM response:', content);
        
        // Try to extract JSON from the response
        let jsonString = content;
        
        // If the response has markdown code blocks, extract the JSON
        const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1];
        } else {
          // Otherwise, try to find the JSON object
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
          }
        }
        
        // Clean up common JSON formatting issues
        jsonString = jsonString
          .replace(/,\s*}/g, '}')  // Remove trailing commas before closing braces
          .replace(/,\s*]/g, ']')  // Remove trailing commas before closing brackets
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
          .replace(/\/\/.*$/gm, '') // Remove // comments
          .replace(/\n/g, ' ')     // Replace newlines with spaces
          .replace(/\s+/g, ' ')    // Normalize whitespace
          .trim();
        
        console.log('Cleaned JSON string:', jsonString);
        acc_companyInfo = JSON.parse(jsonString);
        console.log('Step 3.5: Successfully parsed account company info:', Object.keys(acc_companyInfo));

        console.log('Step 3.6: Updating account company analysis data in database');
        const updatedAccountCompany = await db.updateAccountCompanyAnalysisData(accountDomain, acc_companyInfo); 
        console.log('Updated account company:', updatedAccountCompany);
        analysisData = updatedAccountCompany;
        console.log('Step 3.7: Account company analysis data updated successfully');

       


          
      } 
       
      
        //if have rapidapi data in companies table then return the company data
        const companyData = await db.getCompanyDataByLinkedinUrl(linkedin_url);
        if (companyData) {
          console.log('Step 3.8: Returning company data from database');
          console.log('companyData', companyData);
        
          return res.json({
            company: {
              linkedin_url: linkedin_url,
              analysis_data: JSON.parse(companyData.analysis_data),
              account_company_data: analysisData
            },
            fromCache: true
          });
        }
      
    


    // Get LinkedIn company data from the API (optional - can proceed without it)
    // console.log('Step 4: Fetching LinkedIn company data from API for URL:', linkedin_url);
    // let linkedinCompanyData = null;
    
    // try {
    //   const linkedinOptions = {
    //     method: 'GET',
    //     url: 'https://linkedin-scraper-api-real-time-fast-affordable.p.rapidapi.com/companies/detail',
    //     params: {
    //       identifier: linkedin_url
    //     },
    //     headers: {
    //       'x-rapidapi-key': '01f13aafb7msh62df36b19672861p1b4cdfjsn337bc728e0c9',
    //       'x-rapidapi-host': 'linkedin-scraper-api-real-time-fast-affordable.p.rapidapi.com'
    //     }
    //   };

    //   console.log('Step 4.1: Making LinkedIn API request');
    //   const linkedinResponse = await axios.request(linkedinOptions);


      
    //   linkedinCompanyData = linkedinResponse.data;
    //   console.log('Step 4.2: LinkedIn API response received:', linkedinCompanyData ? 'Success' : 'No data');
    //   console.log('LinkedIn API response data keys:', linkedinCompanyData ? Object.keys(linkedinCompanyData) : 'None');
    // } catch (linkedinError) {
    //   console.error('Step 4.2: LinkedIn API error:', linkedinError.message || linkedinError);
    //   console.log('Step 4.3: LinkedIn API failed - this is optional, continuing with analysis');
    //   console.log('Step 4.4: Error details:', {
    //     status: linkedinError.response?.status,
    //     statusText: linkedinError.response?.statusText,
    //     message: linkedinError.message
    //   });
    //   linkedinCompanyData = null;
    // }

    



      
    const messages = [
      {
        role: 'system',
        content: `You are a GTM business analyst delivering exhaustive, 
        comparative buyer company intelligence (from LinkedIn DOM data) in 
        direct correlation with provided Seller company data.
         Embed AURA Ontology, AURA Mental Models,
         and Heptapod 7-Factor Analysis into all findings and recommendations.AURA ONTOLOGY DIMENSIONS:- Actors: 
         Identify all buyer-side stakeholders, decision-makers, and influencers.- Use Cases: 
         Extract jobs-to-be-done
          and pain/need drivers.- 
          Resources: Describe assets/networks needed or provided.- Actions: Map key workflows 
          and processes.- Outcomes: Define measurable results and business value.- Context: Situate the account in its
           market, technical and regulatory landscape.AURA MENTAL MODELS:- First-principles thinking (reduce needs to 
           root causes)- Second-order effects (spot indirect influences)- Incentives & friction (map motivation and
            resistance)- Narrative advantage (surface stories for influence)HEPTAPOD 7-FACTOR FRAMEWORK (embed as structure and
             comparatives):1. Product Coverage & Breadth2. Price & Affordability
             3. Performance & Reliability4. Integration Ecosystem
              & Openness5. Scalability & Future-readiness
              6. Customer Support & Services7. Brand Equity & PositioningEvery section mus
              t cross-reference Seller strengths and value props (correlation, not just description).
               All logic and claims must clearly 
              cite the AURA/Heptapod principle/factor supporting them`
      },
      {
        role: 'user',
        content: `Based on this company information: 
       
       BUYER linkedin information from company page:  ${domData}
       BUYER linkedin url: ${linkedin_url}


       SELLER company data: ${JSON.stringify(analysisData?.analysis_data )}
       


        Identify the key personas to target for B2B sales  for the buyer company . Provide the response in this exact JSON structure:
        { 
          "company_information": {
             "company_name": "",
              "industry": "",
              "size": "",
              "location": "",
              "description": "",
              "products_services": [],
              "target_markets": [],
              "recent_news": [],
              "key_challenges": [],
              "business_model": "",
              "revenue_model": "",
              "competitors": [],
              "technology_stack": [],
              "growth_stage": "",
              "organization_leadership": [],
              "ideal_customer_personas": [],
              "use_cases": ""
         },
          "personas": [
            {
              "type": "", //decision_maker, champion, budget_holder, end_user..etc.
              "title": "",
              "department": "",
              "seniority_level": "",
              "typical_responsibilities": [],
              "pain_points": [],
              "influence_level": "",
              "budget_authority": "",
              "linkedin_search_title": "Not more than 3 words, and only the words that will definitely be present in the LinkedIn profile",
              "targeting_strategy": "",
              "recommended_approach": ""
            }
          ]
        }
        
        Return ONLY the JSON object with no additional text, code blocks, or formatting.`
      }
    ];

    const llmResponse = await callPerplexityAPI(messages);
    

    
    // Parse the JSON response
    let buyer_analysis_data;
    
      let content = llmResponse.choices[0].message.content;
      console.log('Raw LLM response:', content);
      


if(typeof content === 'string'){
  content = JSON.parse(content);
  console.log('content is a string', content);
}else{
  console.log('content is not a string', content);
}


     
        





      // Try to extract JSON from the response
      let jsonString = content;
      
      // If the response has markdown code blocks, extract the JSON
      // const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      // if (codeBlockMatch) {
      //   jsonString = codeBlockMatch[1];
      // } else {
      //   // Otherwise, try to find the JSON object
      //   const jsonMatch = content.match(/\{[\s\S]*\}/);
      //   if (jsonMatch) {
      //     jsonString = jsonMatch[0];
      //   }
      // }
      
      // Clean up common JSON formatting issues
      // jsonString = jsonString
      // .replace(/,\s*}/g, '}')  // Remove trailing commas before closing braces
      // .replace(/,\s*]/g, ']')  // Remove trailing commas before closing brackets
      // .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      // .replace(/\/\/.*$/gm, '') // Remove // comments
      // .replace(/\n/g, ' ') 
      // .replace(/\\/g, '') 
      // .replace(/\s+/g, ' ')    // Normalize whitespace
      // .trim();
      
      console.log('Cleaned JSON string:', jsonString);
      buyer_analysis_data = jsonString;
      console.log('buyer_analysis_data', buyer_analysis_data);
      // Parse the JSON string to an object instead of storing as string
      // try {
      //   buyer_analysis_data = JSON.parse(jsonString);
      //   console.log('Successfully parsed buyer analysis data to object');
      // } catch (parseError) {
      //   console.error('Failed to parse cleaned JSON:', parseError);
      //   console.log('Falling back to storing as string');
      //   buyer_analysis_data = jsonString;
      // }
      
   
// remove all / from rapidapi data
    // Update company with personas data
    
          console.log('No company found to update with personas data - creating new prospect company');



  



  const company =  await db.createCompany({
            user_id: req.user.userId,
            linkedin_url: linkedin_url,
            analysis_data: JSON.stringify(buyer_analysis_data)
             
          });
        console.log('company', company);









    // Log the API usage
    // await new Promise((resolve, reject) => {
    //   db.db.run(
    //     'INSERT INTO analysis_sessions (user_id, session_type, input_data, output_data, api_usage) VALUES (?, ?, ?, ?, ?)',
    //     [
    //       req.user.userId,
    //       'persona_analysis',
    //       JSON.stringify({ linkedin_url, accountDomain, linkedinCompanyData }),
    //       JSON.stringify(llmResponse),
    //       JSON.stringify({ tokens_used: llmResponse.usage || {} })
    //     ],
    //     (err) => err ? reject(err) : resolve()
    //   );
    // });

    // {
    //   company: {
    //     linkedin_url: linkedin_url,
    //     analysis_data: JSON.parse(companyData.analysis_data),
    //     account_company_data: analysisData
    //   },
    //   fromCache: true
    // }

    // // Return the analysis results
    // const responseData = {
    //   company: company,
    //   account_company_data: analysisData
    // };

    res.json( {
      company: {
        linkedin_url: linkedin_url,
        analysis_data: JSON.parse(company.analysis_data),
        account_company_data: analysisData
      },
      fromCache: false
    });

  
  }  catch (error) {
    console.error('Persona analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze personas' });
  }
});





router.post('/people_analysis', verifyToken, async (req, res) => {
  try {
    const { linkedinUrl, accountDomain, data } = req.body;

    if (!linkedinUrl) {
      return res.status(400).json({ error: 'Linkedin URL is required' });
    }
    if (!accountDomain){
      return res.status(400).json({ error: 'Account Domain is required' });
    }
    if (!data ) {
      return res.status(400).json({ error: 'Profile data and persona information required' });
    }

    // Check if people analysis data is already in the database
    
  
      console.log('Checking for existing people analysis for LinkedIn URL:', linkedinUrl);
      
      // Get prospect by LinkedIn URL
      const existingProspect = await db.getProspectByLinkedInUrl(req.user.userId, linkedinUrl);
      if (existingProspect) {
        console.log('Prospect found in database:', existingProspect);
        
        // Check if analysis_data exists and has meaningful content
        if (existingProspect.analysis_data && Object.keys(existingProspect.analysis_data).length > 0) {
          console.log('Valid cached people analysis data found, returning from cache');
          return res.json({
            analysis: existingProspect.analysis_data,
            fromCache: true
          });
        } else {
          console.log('No valid people analysis data found in database - analysis_data is empty or missing');
        }
      } else {
        console.log('No prospect found in database for LinkedIn URL:', linkedinUrl);
      }
    
      let seller_company_data = await db.getAccountCompanyAnalysisDataByDomain(accountDomain);
    console.log('Account company analysis data result:', seller_company_data ? 'Found' : 'Not found');

    const messages = [
      {
        role: 'system',
        content: `You are a highly advanced GTM and sales intelligence analyst agent. 
        You receive two inputs: 
        Parsed LinkedIn profile page DOM data for an individual 
        and Detailed seller company intelligence JSON from prior analysis.

        Your goal is to generate a detailed, exhaustive, and correlated analysis report combining these data sources. Follow these constraints and tasks strictly.

Hardcoded Frameworks:

AURA_Ontology: Actors, Use Cases, Resources, Actions, Outcomes, Context

AURA_Mental_Models: First-principles thinking, Second-order effects, Incentives & friction, Narrative advantage

Heptapod_7_Factor_Framework: Product Coverage & Breadth, Price & Affordability, Performance & Reliability, Integration Ecosystem & Openness, Scalability & Future-readiness, Customer Support & Services, Brand Equity & Positioning
         Return ONLY valid JSON with no additional text or formatting.`
      },
      {
        role: 'user',
        content: `
        inputs: 
         linkedin profile data: ${JSON.stringify(data)}
         seller company data: ${JSON.stringify(seller_company_data)}
        
        
        Tasks:

Deliver detailed company analysis for the person’s company (same format as prior company intelligence prompt, correlated with seller data).

Profile the individual's detailed title, role, history, activity, education, and skills.

Determine the individual's likely persona type (Champion, Budget Holder, Decision Maker, End User, etc.) in correlation to the seller company buyer personas.

Perform deep personality trait research using scientifically accepted models (e.g., Big Five, DISC) based on available persona data, language, and signals.

Score the likelihood of the individual being a strong ICP fit with the seller company, and provide an ICP fit score plus supporting rationale.

Using the personality trait insights, craft a comprehensive outreach and positioning plan tailored to this individual.

Include any other relevant insights or behavioral signals that could increase outreach success or shorten sales cycles.
        Provide analysis in this exact JSON structure:
        {
          "PersonDetails": {
            "name": "",
            "title": "",
            "company": "",
            "location": "",
            "experience_years": 0,
            "education": "",
            "skills": []
          },
          "PersonalityTraits": {
            "communication_style": "",
            "decision_making_style": "",
            "key_motivators": [],
            "potential_objections": []
          },
          "ICP_FitScore": {
            "score": 0,
            "max_score": 10,
            "reasoning": "",
            "fit_factors": []
          },
          "OutreachPlan": {
            "recommended_approach": "",
            "key_talking_points": [],
            "best_contact_method": "",
            "timing_recommendations": ""
          },
          "AdditionalInsights": {
            "mutual_connections": [],
            "shared_interests": [],
            "conversation_starters": [],
            "red_flags": []
          },
          "personalize_linkedin_message_to_reach_out": "",
          "personalize_email_message_to_reach_out": ""
        }
        
        Return ONLY the JSON object with no additional text, code blocks, or formatting.`
      }
    ];

    const llmResponse = await callPerplexityAPI(messages);
    
    // Parse the JSON response
    let peopleAnalysis;
    try {
      const content = llmResponse.choices[0].message.content;
      console.log('Raw People Analysis response:', content);
      
      // Try to extract JSON from the response
      let jsonString = content;
      
      // If the response has markdown code blocks, extract the JSON
      const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      } else {
        // Otherwise, try to find the JSON object
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
      }
      
      // Clean up common JSON formatting issues
      jsonString = jsonString
        .replace(/,\s*}/g, '}')  // Remove trailing commas before closing braces
        .replace(/,\s*]/g, ']')  // Remove trailing commas before closing brackets
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
        .replace(/\/\/.*$/gm, '') // Remove // comments
        .replace(/\n/g, ' ')     // Replace newlines with spaces
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
      
      console.log('Cleaned People JSON string:', jsonString);
      peopleAnalysis = JSON.parse(jsonString);
      
    } catch (parseError) {
      console.error('Failed to parse people analysis response:', parseError);
      console.error('Raw content:', llmResponse.choices[0].message.content);
      
      // Return a fallback structure instead of failing
      peopleAnalysis = {
        "PersonDetails": {
          "name": "Analysis Failed",
          "title": "Unknown",
          "company": "Unknown",
          "location": "Unknown",
          "experience_years": 0,
          "education": "Unknown",
          "skills": []
        },
        "PersonaType": {
          "type": "unknown",
          "confidence": "low",
          "reasoning": "Analysis failed due to JSON parsing error"
        },
        "PersonalityTraits": {
          "communication_style": "Unknown",
          "decision_making_style": "Unknown",
          "key_motivators": [],
          "potential_objections": []
        },
        "ICP_FitScore": {
          "score": 0,
          "max_score": 10,
          "reasoning": "Analysis failed",
          "fit_factors": []
        },
        "OutreachPlan": {
          "recommended_approach": "Retry analysis with corrected data",
          "key_talking_points": [],
          "best_contact_method": "Unknown",
          "timing_recommendations": "Unknown"
        },
        "AdditionalInsights": {
          "mutual_connections": [],
          "shared_interests": [],
          "conversation_starters": [],
          "red_flags": ["Analysis parsing failed"]
        }
      };
    }

    // Save people analysis data to database if LinkedIn URL is available
    if (linkedinUrl) {
      console.log('Saving people analysis data for LinkedIn URL:', linkedinUrl);
      
      // Check if prospect already exists
      const existingProspect = await db.getProspectByLinkedInUrl(req.user.userId, linkedinUrl);
      
      if (existingProspect) {
        // Update existing prospect
        console.log('Updating existing prospect with analysis data for prospect ID:', existingProspect.id);
        await new Promise((resolve, reject) => {
          db.db.run(
            'UPDATE prospects SET analysis_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [JSON.stringify(peopleAnalysis), existingProspect.id],
            (err) => {
              if (err) {
                console.error('Error updating prospect analysis data:', err);
                reject(err);
              } else {
                console.log('Prospect analysis data updated successfully');
                resolve();
              }
            }
          );
        });
      } else {
        // Create new prospect
        console.log('Creating new prospect with analysis data');
        await db.createProspect({
          user_id: req.user.userId,
          linkedin_url: linkedinUrl,
          analysis_data: peopleAnalysis,
          profile_data: data
        });
      }
    } else {
      console.log('No LinkedIn URL available, skipping database save');
    }

    // Log the API usage
    // await new Promise((resolve, reject) => {
    //   db.db.run(
    //     'INSERT INTO analysis_sessions (user_id, session_type, input_data, output_data, api_usage) VALUES (?, ?, ?, ?, ?)',
    //     [
    //       req.user.userId,
    //       'people_analysis',
    //       JSON.stringify({ linkedinUrl, accountDomain, data }),
    //       JSON.stringify(llmResponse),
    //       JSON.stringify({ tokens_used: llmResponse.usage || {} })
    //     ],
    //     (err) => err ? reject(err) : resolve()
    //   );
    // });

    res.json({
      people: peopleAnalysis,
      fromCache: false
    });
  } catch (error) {
    console.error('People analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze people' });
  }
});


module.exports = router;

