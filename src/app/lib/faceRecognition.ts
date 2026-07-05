import * as faceapi from 'face-api.js';

export const FACE_MODEL_URLS = ['/models', 'https://justadudewhohacks.github.io/face-api.js/models'];

export interface MockStudentProfile {
  id: string;
  name: string;
  descriptor: Float32Array;
}

const createMockDescriptor = (seedText: string) => {
  let seed = Array.from(seedText).reduce((accumulator, character) => {
    return ((accumulator << 5) - accumulator + character.charCodeAt(0)) >>> 0;
  }, 0);

  const descriptor = new Float32Array(128);

  for (let index = 0; index < descriptor.length; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const normalized = seed / 0xffffffff;
    descriptor[index] = normalized * 2 - 1;
  }

  return descriptor;
};

export const mockStudentProfiles: MockStudentProfile[] = [
  { id: '1', name: 'John Doe', descriptor: createMockDescriptor('John Doe') },
  { id: '2', name: 'Jane Smith', descriptor: createMockDescriptor('Jane Smith') },
  { id: '3', name: 'Mike Johnson', descriptor: createMockDescriptor('Mike Johnson') },
  { id: '4', name: 'Sarah Wilson', descriptor: createMockDescriptor('Sarah Wilson') },
  { id: '5', name: 'Alex Chen', descriptor: createMockDescriptor('Alex Chen') },
  { id: '6', name: 'Emily Brown', descriptor: createMockDescriptor('Emily Brown') },
  { id: '7', name: 'David Wilson', descriptor: createMockDescriptor('David Wilson') },
  { id: '8', name: 'Lisa Garcia', descriptor: createMockDescriptor('Lisa Garcia') },
];

export const buildFaceMatcher = (threshold = 0.58) => {
  const labeledDescriptors = mockStudentProfiles.map(
    (student) => new faceapi.LabeledFaceDescriptors(student.name, [student.descriptor])
  );

  return new faceapi.FaceMatcher(labeledDescriptors, threshold);
};

export const loadFaceRecognitionModels = async () => {
  let lastError: unknown = null;

  for (const modelUrl of FACE_MODEL_URLS) {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
      ]);

      return modelUrl;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to load face-api.js models from any configured source.');
};