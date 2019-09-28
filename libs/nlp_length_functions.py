from nltk.tokenize import sent_tokenize, word_tokenize
import statistics
from collections import Counter
from scipy.stats import mode
#Note: The mode function used by functions in this file returns the smallest value mode if a distribution is multimodal


class NLPLengths:
    def __init__(self, db):
        """
        Args:
            db (ReviewDB): object containing the dataframe of reviews
        """
        self.db = db

    def word_token_review_length_counter(self, _id):
        '''
        Args:
            _id: either a review id or a cluster id

        Returns:
            tuple(Counter {int length: int word count}, 
            float average, 
            int median, 
            tuple(int mode, int count), 
            float std_dev)
        '''
        id_list = self.db.decode_id(_id)
        length_count = Counter()
        avg_numerator = 0
        count_list = []#for calculating measures of center
        if not id_list or len(id_list) < 1:
            return (length_count, 0, 0, 0, 0)
        for item in id_list:
            review = self.db.get_review_from_id(item)
            words = word_tokenize(review.text.values[0])
            length = len(words)
            count_list.append(length)
            avg_numerator += length
            length_count[str(length)] += 1
        avg = float(avg_numerator) / float(len(id_list))
        return (length_count, avg, statistics.median(count_list), mode(count_list), self.std_dev(count_list))

    def sent_token_review_length_counter(self, _id):
        '''
        Args:
            _id: either a review id or a cluster id

        Returns:
            tuple(Counter {int length: int sent count}, 
            float average, 
            int median, 
            tuple(int mode, int count), 
            float std_dev)
        '''
        id_list = self.db.decode_id(_id)
        length_count = Counter()
        avg_numerator = 0
        count_list = []#for calculating measures of center
        if not id_list or len(id_list) < 1:
            return (length_count, 0, 0, 0, 0)
        for item in id_list:
            review = self.db.get_review_from_id(item)
            sents = sent_tokenize(review.text.values[0])
            length = len(sents)
            count_list.append(length)
            avg_numerator += length
            length_count[str(length)] += 1
        avg = float(avg_numerator) / float(len(id_list))
        return (length_count, avg, statistics.median(count_list), mode(count_list), self.std_dev(count_list))

    def char_review_length_counter(self, _id):
        '''
        Args:
            _id: either a review id or a cluster id

        Returns:
            tuple(Counter {int length: int sent count}, 
            float average, 
            int median, 
            tuple(int mode, int count), 
            float std_dev)
        '''
        id_list = self.db.decode_id(_id)
        length_count = Counter()
        avg_numerator = 0
        count_list = []#for calculating measures of center
        if not id_list or len(id_list) < 1:
            return (length_count, 0, 0, 0, 0)
        for item in id_list:
            review = self.db.get_review_from_id(item)
            length = len(review.text.values[0])
            count_list.append(length)
            avg_numerator += length
            length_count[str(length)] += 1
        avg = float(avg_numerator) / float(len(id_list))
        return (length_count, avg, statistics.median(count_list), mode(count_list), self.std_dev(count_list))

    def mode(self, count_list):
        '''
        Args:
            count_list: list of ints

        Returns:
            tuple(int mode, int count)
        '''
        if count_list is None or len(count_list) < 1:
            return (0, 0)
        else:
            mode_result = mode(count_list)
            return (mode_result[0], mode_result[1])

    def std_dev(self, count_list):
        '''
        Args:
            count_list: list of ints

        Returns:
            float
        '''
        if len(count_list) < 2:
            return 0.0
        else: return statistics.stdev(count_list)




