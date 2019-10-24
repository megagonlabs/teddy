import numpy as np
import sys

from collections import Counter
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.feature_extraction.text import TfidfVectorizer

class TFIDFModel:
    def __init__(self, db, ngramsize=1):
        """
        Args:
            db (ReviewDB): object containing the dataframe of reviews
            ngramsize: int, default 1, specify number of words per token used by the model
        """
        self.db = db
        documents = db.clusters_df.text
        self.num_docs = len(documents)
        tv = TfidfVectorizer(stop_words='english', ngram_range=(ngramsize, ngramsize))

        X = tv.fit_transform(documents)
        self.tfidf = tv
        self.matrix = X



    def top_k(self, group_id, k=5):
        """
        Get a dictionary with k elements, where keys are the top k tfidf-scored words for this group,
        and values are the tfidf score

        Args:
            group_id (string): id for a review or a cluster
            k (int, optional): how many words to return

        Returns:
            dict: {word: tfidf-score}
        """

        # Get list of document indices from the group_id
        indices = self.db.decode_id(group_id)
        # vectorize
        ind_vector = np.zeros(self.num_docs)
        ind_vector[indices] = 1

        # scores for this group indexed by word
        scores = ind_vector * self.matrix
        return self.scores_to_counter(scores, k=k)

    def tfidf_score(self, group_id, words):
        """Get TFIDF score for words in a given cluster/review (as dictated by group_id)

        Args:
            group_id (string): identifier for a review or a cluster
            words (list(string)): the word to compute score for

        Returns:
            dict: counter of {word: tfidf-score}
        """
        indices = self.db.decode_id(group_id)
        # vectorize
        ind_vector = np.zeros(self.num_docs)
        ind_vector[indices] = 1

        #create sparse matrix of the length of the vocabulary
        vocab = self.tfidf.get_feature_names()
        # print(vocab)
        word_indices = np.zeros(len(vocab))
        #mask with only words specified in the parameters
        for word in words:
            word_indices[vocab.index(word)] = 1

        scores = ind_vector * self.matrix * word_indices
        # print(scores)
        return self.scores_to_counter(scores, wlist=words)

    def compare_top_k(self, group_id1, group_id2, k=5):
        """Get tfidf scores for the set of topk words in group 1 and group 2, relative to both groups

        Args:
            group_id1 (string): id for a review or a cluster
            group_id2 (string): id for a review or a cluster
            k (int, optional): min number of words

        Returns:
            tuple(dict): dictionary of tfidf scores for the set of words
                these dictionaries should have the same keys, between k and 2k of them
        """
        topk1 = self.top_k(group_id1, k=k)
        topk2 = self.top_k(group_id2, k=k)
        keys1 = list(topk1.keys())
        keys2 = list(topk2.keys())
        topk2.update(self.tfidf_score(group_id2, keys1))
        topk1.update(self.tfidf_score(group_id1, keys2))
        return topk1, topk2

    def compare_fixed_set(self, group_id1, group_id2, k=5):
        """Get tfidf scores for top words in group 1, and corresponding scores for the same words in group 2

        Args:
            group_id1 (string): id for a cluster
            group_id2 (string): id for a cluster
            k (int, optional): min number of words

        Returns:
            tuple(dict): dictionary of tfidf scores for the set of words
            these dictionaries should have the same keys from group 1
        """
        topk1 = self.top_k(group_id1, k=k)
        keys1 = list(topk1.keys())
        topk2 = self.tfidf_score(group_id2, keys1)
        return topk1, topk2

    def scores_to_counter(self, scores_vector, k = None, wlist = None):
        # get word representation of each index
        words = self.tfidf.get_feature_names()

        # sort, get top k
        tuples = sorted(zip(scores_vector, words), reverse=True)
        if k:
            tuples = tuples[:k]
        return_dict = Counter()
        for t in tuples:
            if wlist: #if a list of words is provided
                if t[1] not in wlist:
                    continue
            # print(t)
            return_dict[t[1]] = t[0]
        return return_dict

# if __name__=='__main__':
#     test_documents = ["This hotel is crazy", "What a hotel!", "you can't find a better hotel"]
#     test_tv = TFIDFModel(test_documents, range(3))

#     print(test_tv.top_k('a', 2))

#     print(test_tv.compare_top_k('a', 'b', 2))


