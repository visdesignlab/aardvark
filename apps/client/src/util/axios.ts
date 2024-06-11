import S3FileFieldClient, { type S3FileFieldProgress, S3FileFieldProgressState } from 'django-s3-file-field';
import axios, { type AxiosInstance, type AxiosPromise, type AxiosRequestConfig, type AxiosResponse } from 'axios';

interface LoonAxiosInstance extends AxiosInstance {
    upload(file: File):Promise<string>;
    process(fieldValue:string,workflow_code: string, file_type: string, file_name: string, location: string, experiment_name: string):AxiosPromise<ProcessResponseData>;
    checkForUpdates(task_id:string):AxiosPromise<StatusResponseData>;
}

export interface StatusResponseData {
    status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ERROR';
    message: string;
}

export interface ProcessResponseData {
    status: 'SUCCEEDED' | 'FAILED';
    message: string;
    task_id?: string;
}

export function createLoonAxiosInstance(config:AxiosRequestConfig):LoonAxiosInstance {
    const axiosInstance = axios.create(config)
    const Proto = Object.getPrototypeOf(axiosInstance)

    // Upload function
    Proto.upload = async function(file: File): Promise<string>{
        // Create new S3FileField Client
        const s3ffClient = new S3FileFieldClient({
            baseUrl: `${this.defaults.baseURL}/s3-upload/`,
            apiConfig: this.defaults
        });
        // Upload straight to Minio and get back the FieldValue
        const fieldValue = await s3ffClient.uploadFile(file, 'api.LoonUpload.blob');
        return fieldValue.value
    }

    Proto.process = async function(fieldValue:string,workflow_code: string, file_type: string, file_name: string, location: string, experiment_name: string): AxiosPromise<ProcessResponseData>{
        return this.post(`${this.defaults.baseURL}/process/`, {
            field_value: fieldValue,
            workflow_code,
            file_type,
            file_name,
            location,
            experiment_name
        });
    }

    Proto.checkForUpdates = async function(task_id:string): AxiosPromise<StatusResponseData>{
        return this.get(`${this.defaults.baseURL}/process/${task_id}`);
    }



    return axiosInstance as LoonAxiosInstance
}