import React, { useState, useEffect } from 'react';
import { fetchKnowledgeData } from '../../lib/api/psychology-pipeline-demo';

const KnowledgeParsingDemo = () => {
  const [showRawData, setShowRawData] = useState(false);
  const [knowledgeData, setKnowledgeData] = useState(null);

  useEffect(() => {
    const getData = async () => {
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
            {dsm5["Major Depressive Disorder"].map((criterion, index) => (
              <li key={index}>{criterion}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>PDM-2 Psychodynamic Framework</h4>
          <h5>Personality Patterns</h5>
          <ul>
            {pdm2["Personality Patterns"].map((pattern, index) => (
              <li key={index}>{pattern}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Big Five Personality Assessment</h4>
          <h5>Traits</h5>
          <ul>
            {bigFive["Traits"].map((trait, index) => (
              <li key={index}>{trait}</li>
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
