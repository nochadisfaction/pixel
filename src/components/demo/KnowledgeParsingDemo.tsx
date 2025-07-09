import { useState, useEffect } from 'react';
// Dynamic import moved to function call to avoid static/dynamic import conflict

// Define proper types for the knowledge data
interface KnowledgeData {
  dsm5: {
    "Major Depressive Disorder": string[];
  };
  pdm2: {
    "Personality Patterns": string[];
  };
  bigFive: {
    Traits: string[];
  };
}

const KnowledgeParsingDemo = () => {
  const [showRawData, setShowRawData] = useState(false);
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeData | null>(null);

  useEffect(() => {
    const getData = async () => {
      const { fetchKnowledgeData } = await import('../../lib/api/psychology-pipeline-demo');
      const data = await fetchKnowledgeData();
      setKnowledgeData(data);
    };
    getData();
  }, []);

  if (!knowledgeData) {
    return <div>Loading...</div>;
  }

  const { dsm5, pdm2, bigFive } = knowledgeData;

  return (
    <div style={{ fontFamily: 'sans-serif', margin: '20px' }}>
      <h3>Knowledge Parsing Demonstration</h3>
      <button onClick={() => setShowRawData(!showRawData)}>
        {showRawData ? 'Hide' : 'Show'} Raw Data
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <div>
          <h4>DSM-5 Diagnostic Criteria</h4>
          <h5>Major Depressive Disorder</h5>
          <ul>
            {dsm5["Major Depressive Disorder"].map((criterion: string, index: number) => (
              <li key={`dsm5-criterion-${index}-${criterion.slice(0, 20)}`}>{criterion}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>PDM-2 Psychodynamic Framework</h4>
          <h5>Personality Patterns</h5>
          <ul>
            {pdm2["Personality Patterns"].map((pattern: string, index: number) => (
              <li key={`pdm2-pattern-${index}-${pattern.slice(0, 10)}`}>{pattern}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Big Five Personality Assessment</h4>
          <h5>Traits</h5>
          <ul>
            {bigFive["Traits"].map((trait: string, index: number) => (
              <li key={`bigfive-trait-${index}-${trait}`}>{trait}</li>
            ))}
          </ul>
        </div>
      </div>
      {showRawData && (
        <pre style={{ background: '#f4f4f4', border: '1px solid #ddd', padding: '10px' }}>
          {JSON.stringify(knowledgeData, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default KnowledgeParsingDemo;
