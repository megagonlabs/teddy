import numpy as np
from preprocessing_scripts.schema import attributes as schema

def summarize_hotel(hotel_id, dataset, attribute_schema='default'):
    '''
    Args:
            hotel_id: str business_id corresponding to a given hotel in our dataset
            dataset: pandas df to be searched over
        Returns:
            dict of summary statistics for the hotel
    '''
    H_m = get_reviews_for_hotel(hotel_id, dataset)
    H_m = H_m[schema]
    H_avg = np.mean(H_m,axis=0)
    H_max = np.amax(H_m,axis=0)
    H_min = np.amin(H_m,axis=0)
    H_std = np.std(H_m, axis=0)
    H_std_plus = H_avg + H_std
    H_std_minus = H_avg - H_std

    return {"avg":H_avg,
    "max":H_max,
    "min":H_min,
    "std":H_std,
    "std_plus":H_std_plus,
    "std_minus":H_std_minus,
    "combined":np.concatenate((H_min, H_std_minus, H_avg, H_std_plus, H_max),axis=0)}

def get_reviews_for_hotel(hotel_id, dataset):
        '''
        Args:
            hotel_id: str business_id corresponding to a given hotel in our dataset
            dataset: pandas df to be searched over
        Returns:
            df of reviews corresponding to that hotel
        '''
        matches = dataset.business_id.isin([hotel_id])
        review_match_df = dataset[matches]
        return review_match_df