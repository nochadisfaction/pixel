import React, { useState, useEffect, useCallback } from 'react';
import type { ClinicalCase, PatientInfo } from '../../lib/types/psychology-pipeline';
import { fetchClinicalCase } from '../../lib/api/psychology-pipeline-demo';
import ProgressBar from '../ui/progress-bar';

const ScenarioGenerationDemo: React.FC = () => {
  const [clinicalCase, setClinicalCase] = useState<ClinicalCase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<Partial<PatientInfo>>({
    age: 35,
    gender: 'Female',
    occupation: 'Software Engineer',
    background: 'Patient reports a history of anxiety and has recently experienced a major life stressor (job loss).',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPatientInfo(prev => ({ ...prev, [name]: value }));
  };

  const loadData = useCallback(async (info?: Partial<PatientInfo>) => {
    setLoading(true);
    try {
      const data = await fetchClinicalCase(info);
      setClinicalCase(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch clinical case data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(patientInfo);
  }, [loadData, patientInfo]);

  const handleGenerateNewScenario = () => {
    loadData(patientInfo);
  };

  if (loading && !clinicalCase) {
    return <div className="p-6 bg-gray-900 text-white rounded-lg">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 bg-gray-900 text-white rounded-lg">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Scenario Generation Showcase</h2>
        <button
          onClick={handleGenerateNewScenario}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-gray-500"
        >
          {loading ? 'Loading...' : 'Generate New Scenario'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h3 className="text-xl font-semibold mb-2">Create Client Profile</h3>
          <div className="p-4 bg-gray-800 rounded-lg space-y-4">
            <div>
              <label htmlFor="age" className="block text-sm font-medium">Age</label>
              <input type="number" name="age" id="age" value={patientInfo.age || ''} onChange={handleInputChange} className="w-full p-2 bg-gray-700 rounded-md" />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium">Gender</label>
              <input type="text" name="gender" id="gender" value={patientInfo.gender || ''} onChange={handleInputChange} className="w-full p-2 bg-gray-700 rounded-md" />
            </div>
            <div>
              <label htmlFor="occupation" className="block text-sm font-medium">Occupation</label>
              <input type="text" name="occupation" id="occupation" value={patientInfo.occupation || ''} onChange={handleInputChange} className="w-full p-2 bg-gray-700 rounded-md" />
            </div>
            <div>
              <label htmlFor="background" className="block text-sm font-medium">Background</label>
              <textarea name="background" id="background" value={patientInfo.background || ''} onChange={handleInputChange} rows={4} className="w-full p-2 bg-gray-700 rounded-md" />
            </div>
          </div>
        </div>

        {clinicalCase && (
          <div className="md:col-span-2">
            <h3 className="text-xl font-semibold mb-2">Generated Scenario</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold mb-2">Presenting Problem Development</h4>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <ul className="space-y-4">
                    {clinicalCase.presentingProblemDevelopment.map((event) => (
                      <li key={event.time} className="flex items-start">
                        <div className="flex-shrink-0 w-24 text-right mr-4">
                          <span className="font-semibold">{event.time}</span>
                        </div>
                        <div className="flex-grow">
                          <p>{event.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">Clinical Formulation</h4>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <p><strong>Provisional Diagnosis:</strong> {clinicalCase.clinicalFormulation.provisionalDiagnosis.join(', ')}</p>
                  <div className="mt-2">
                    <strong>Contributing Factors:</strong>
                    <ul className="list-disc list-inside ml-4">
                      <li><strong>Biological:</strong> {clinicalCase.clinicalFormulation.contributingFactors.biological.join(', ')}</li>
                      <li><strong>Psychological:</strong> {clinicalCase.clinicalFormulation.contributingFactors.psychological.join(', ')}</li>
                      <li><strong>Social:</strong> {clinicalCase.clinicalFormulation.contributingFactors.social.join(', ')}</li>
                    </ul>
                  </div>
                  <p className="mt-2"><strong>Summary:</strong> {clinicalCase.clinicalFormulation.summary}</p>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">Treatment Plan</h4>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <div>
                    <strong>Goals:</strong>
                    <ul className="list-disc list-inside ml-4">
                      <li><strong>Short-term:</strong> {clinicalCase.treatmentPlan.goals.shortTerm.join(', ')}</li>
                      <li><strong>Long-term:</strong> {clinicalCase.treatmentPlan.goals.longTerm.join(', ')}</li>
                    </ul>
                  </div>
                  <p className="mt-2"><strong>Interventions:</strong> {clinicalCase.treatmentPlan.interventions.join(', ')}</p>
                  <p className="mt-2"><strong>Modalities:</strong> {clinicalCase.treatmentPlan.modalities.join(', ')}</p>
                  <p className="mt-2"><strong>Outcome Measures:</strong> {clinicalCase.treatmentPlan.outcomeMeasures.join(', ')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-2">Demographic Balancing & Diversity</h3>
        <div className="p-4 bg-gray-800 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProgressBar label="Age: 20-35" value={60} color="#4F46E5" />
          <ProgressBar label="Age: 36-50" value={30} color="#4F46E5" />
          <ProgressBar label="Age: 51+" value={10} color="#4F46E5" />
          <ProgressBar label="Gender: Male" value={45} color="#D97706" />
          <ProgressBar label="Gender: Female" value={50} color="#D97706" />
          <ProgressBar label="Gender: Non-binary" value={5} color="#D97706" />
          <ProgressBar label="Occupation: STEM" value={40} color="#059669" />
          <ProgressBar label="Occupation: Arts" value={25} color="#059669" />
          <ProgressBar label="Occupation: Other" value={35} color="#059669" />
        </div>
      </div>
    </div>
  );
};

export default ScenarioGenerationDemo;
