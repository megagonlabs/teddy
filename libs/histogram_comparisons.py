import numpy as np
from collections import Counter


class HistogramComparison:
    def __init__(self):
        pass

    def density_estimator(self, distribution):
        '''
        Normalize a histogram distribution
        Args:
            distribution: Counter object representing a histogram

        Returns:
            Counter {int length: float normalized count} such that sum of values == 1
        '''
        denominator = float(sum(distribution.values()))
        if denominator == 0:
            return distribution
        density_counter = Counter()
        for key in distribution:
            density_counter[key] = float(distribution[key])/denominator
        return density_counter

    def verify_normalization(self, distribution):
        '''
        Verify if passed distribution is a density distribution, and if not convert it to one
        Args:
            distribution: Counter object representing a histogram

        Returns:
            Counter {int length: float normalized count} such that sum of values == 1
        '''
        keys = distribution.keys()
        if len(keys) < 1:
            return None
        if type(distribution[list(keys)[0]]) is int:
            return self.density_estimator(distribution)
        else:
            return distribution

    def convert_to_sparse_array(self, p, q):
        '''
        Convert two Counter objects into continuous sparse numpy arrays
        Args:
            p: Counter object representing a histogram
            q: Counter object representing a histogram

        Returns:
            nparray1: sparse numpy array
            nparray2: sparse numpy array
        '''
        key_set = set(p.keys()).union(set(q.keys()))
        nparray1 = []
        nparray2 = []
        for key in key_set:
            nparray1.append(p[key])
            nparray2.append(q[key])
        return np.array(nparray1), np.array(nparray2)


    def hellinger(self, p, q):
        '''
        Calculate Hellinger distance
        Args:
            p: Counter object representing a histogram
            q: Counter object representing a histogram
        Note: this function accepts p and q both as normalized distributions and as raw counts

        Returns:
            float distance score
        '''
        p = self.verify_normalization(p)
        q = self.verify_normalization(q)
        if not p or not q:
            return None
        else:
            p, q = self.convert_to_sparse_array(p, q)
            return np.sqrt(np.sum((np.sqrt(p) - np.sqrt(q)) ** 2)) / np.sqrt(2)

    def chi_square(self, p, q):
        '''
        Calculate chi-squared distance
        Args:
            p: Counter object representing a histogram
            q: Counter object representing a histogram
        Note: this function accepts p and q both as normalized distributions and as raw counts

        Returns:
            float distance score
        '''
        p = self.verify_normalization(p)
        q = self.verify_normalization(q)
        if not p or not q:
            return None
        else:
            p, q = self.convert_to_sparse_array(p, q)
            return np.sum(((p - q) **2)/ (p+q))/ 2.0

    def euclidean(self, p, q):
        '''
        Calculate euclidean distance
        Args:
            p: Counter object representing a histogram
            q: Counter object representing a histogram
        Note: this function accepts p and q both as normalized distributions and as raw counts

        Returns:
            float distance score
        '''
        p = self.verify_normalization(p)
        q = self.verify_normalization(q)
        if not p or not q:
            return None
        else:
            p, q = self.convert_to_sparse_array(p, q)
            return np.sqrt(np.sum((p - q) **2))

    def sorensen(self, p, q):
        '''
        Calculate Sorensen distance
        Args:
            p: Counter object representing a histogram
            q: Counter object representing a histogram
        Note: this function accepts p and q both as normalized distributions and as raw counts

        Returns:
            float distance score
        '''
        p = self.verify_normalization(p)
        q = self.verify_normalization(q)
        if not p or not q:
            return None
        else:
            p, q = self.convert_to_sparse_array(p, q)
            return np.sum(np.abs(p - q)) / np.sum(p + q)

    def intersection(self, p, q):
        '''
        Calculate intersection distance
        Args:
            p: Counter object representing a histogram
            q: Counter object representing a histogram
        Note: this function accepts p and q both as normalized distributions and as raw counts

        Returns:
            float distance score
        '''
        p = self.verify_normalization(p)
        q = self.verify_normalization(q)
        if not p or not q:
            return None
        else:
            p, q = self.convert_to_sparse_array(p, q)
            return np.sum(np.minimum(p, q))

    def jaccard(self, p, q):
        '''
        Calculate Jaccard distance
        Args:
            p: Counter object representing a histogram
            q: Counter object representing a histogram
        Note: this function accepts p and q both as normalized distributions and as raw counts

        Returns:
            float distance score
        '''
        p = self.verify_normalization(p)
        q = self.verify_normalization(q)
        if not p or not q:
            return None
        else:
            p, q = self.convert_to_sparse_array(p, q)
            kumar_hassebrook = np.sum(p * q) / (np.sum(p ** 2) + np.sum(q ** 2) - np.sum(p * q))
            return 1 - kumar_hassebrook

    def jensen_shannon(self, p, q):
        '''
        Calculate Jensen-Shannon entropy distance
        Args:
            p: Counter object representing a histogram
            q: Counter object representing a histogram
        Note: this function accepts p and q both as normalized distributions and as raw counts

        Returns:
            float distance score
        '''
        p = self.verify_normalization(p)
        q = self.verify_normalization(q)
        if not p or not q:
            return None
        else:
            p, q = self.convert_to_sparse_array(p, q)
            return 0.5 * (np.sum(p * np.log(((2 * p + 1e-27) / (p+q)))) + np.sum(q * np.log((2 * q + 1e-27) / (p+q) )))
