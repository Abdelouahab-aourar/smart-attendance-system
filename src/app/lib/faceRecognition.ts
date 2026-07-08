import * as faceapi from 'face-api.js';

export const FACE_MODEL_URLS = ['/models', 'https://justadudewhohacks.github.io/face-api.js/models'];

export interface MockStudentProfile {
  id: string;
  name: string;
  descriptor: Float32Array;
}

export interface EnrolledStudent {
  studentId: string;
  studentName: string;
  created_at?: string;
  modified_at?: string;
  images: string[];
  descriptors: number[][];
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

const buildFallbackEnrolledStudents = (): EnrolledStudent[] => {
  return mockStudentProfiles.map((student) => ({
    studentId: student.id,
    studentName: student.name,
    images: [],
    descriptors: [Array.from(student.descriptor)],
  }));
};

export const buildFaceMatcher = (students: EnrolledStudent[] = [], threshold = 0.58) => {
  const withDescriptors = students.filter((student) => student.descriptors.length > 0);
  const sourceStudents = withDescriptors.length > 0 ? withDescriptors : buildFallbackEnrolledStudents();

  const labeledDescriptors = sourceStudents.map(
    (student) =>
      new faceapi.LabeledFaceDescriptors(
        student.studentName,
        student.descriptors.map((descriptor) => new Float32Array(descriptor))
      )
  );
  return new faceapi.FaceMatcher(labeledDescriptors, threshold);
};

export const extractFaceDescriptorsFromImages = async (imageSources: string[]) => {
  const descriptors: number[][] = [];

  for (const imageSource of imageSources) {
    try {
      const image = await faceapi.fetchImage(imageSource);
      const detection = await faceapi
        .detectSingleFace(
          image,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        descriptors.push(Array.from(detection.descriptor));
      }
    } catch (error) {
      console.error('Failed to extract face descriptor from image:', error);
    }
  }

  return descriptors;
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