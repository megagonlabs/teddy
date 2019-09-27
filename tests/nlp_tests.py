import unittest
from collections import Counter
from libs.TfidfModel import TFIDFModel
from libs.nlp_length_functions import NLPLengths
from libs.review_db import ReviewDB



class NLPTests(unittest.TestCase):

    def test_TFIDF_init(self):
        db = ReviewDB.load(cluster_file='tests/testing_db.csv')
        tfidf = TFIDFModel(db)
        self.assertFalse(tfidf is None)

    def test_TFIDF_funcs(self):
        db = ReviewDB.load(cluster_file='tests/testing_db.csv')
        tfidf = TFIDFModel(db)
        #test tfidf.tfidf_score(), which also calls tfidf.scores_to_counter()
        tfidf_zero = tfidf.tfidf_score(0, ['wharf'])
        self.assertTrue('wharf' in tfidf_zero.keys())
        self.assertFalse('banana' in tfidf_zero.keys())
        tfidf_cluster = tfidf.tfidf_score('1-2-1-0-0', ['towels', 'unwelcome', 'charge', 'wharf'])
        self.assertGreater(tfidf_cluster['towels'], 0)
        self.assertGreater(tfidf_cluster['unwelcome'], 0)
        self.assertGreater(tfidf_cluster['charge'], 0)
        self.assertEqual(tfidf_cluster['wharf'], 0.0)
        #test tfidf.top_k(), which also calls tfidf.scores_to_counter()
        top_for_zero = tfidf.top_k(0)
        self.assertTrue('wharf' in top_for_zero.keys())
        top_for_cluster = tfidf.top_k('1-2-1-0-0')
        self.assertTrue('towels' in top_for_cluster.keys())
        self.assertTrue('charge' in top_for_cluster.keys())
        self.assertFalse('wharf' in top_for_cluster.keys())
        #test tfidf.compare_top_k()
        group1, group2 = tfidf.compare_top_k(0, '1-2-1-0-0')
        #test combination of keys
        compare_top_k_test1 = True
        compare_top_k_test2 = True
        #test key values
        compare_top_k_test3 = True
        compare_top_k_test4 = True
        for key in top_for_cluster.keys():
            if key not in group1.keys() or key not in group2.keys():
                compare_top_k_test1 = False
                break
            if group2[key] != top_for_cluster[key]:
                compare_top_k_test3 = False
                break
        for key in top_for_zero.keys():
            if key not in group2.keys() or key not in group1.keys():
                compare_top_k_test2 = False
                break
            if group1[key] != top_for_zero[key]:
                print(key, ' ', group1[key], ' ', top_for_zero[key])
                compare_top_k_test4 = False
                break
        self.assertTrue(compare_top_k_test1)
        self.assertTrue(compare_top_k_test2)
        self.assertTrue(compare_top_k_test3)
        self.assertTrue(compare_top_k_test4)
        self.assertEqual(group2['wharf'], 0.0)
        
    def test_tfidf_bigram(self):
        db = ReviewDB.load(cluster_file='tests/testing_db.csv')
        tfidf = TFIDFModel(db, ngramsize=2)
        tfidf_zero = tfidf.tfidf_score(0, ["wharf rooms"])
        # print(tfidf_zero)
        self.assertTrue(("wharf rooms") in tfidf_zero.keys())

    def test_nlplength_init(self):
        db = ReviewDB.load(cluster_file='tests/testing_db.csv')
        nlp = NLPLengths(db)
        self.assertFalse(nlp is None)
    def test_nlplength_funcs(self):
        db = ReviewDB.load(cluster_file='tests/testing_db.csv')
        nlp = NLPLengths(db)
        #Test empty set
        empty1 = nlp.word_token_review_length_counter([])
        self.assertEqual(empty1, (Counter(), 0, 0, 0, 0))

        #Test word_token_review_length_counter
        word_result_zero = nlp.word_token_review_length_counter(0)
        print(word_result_zero)
        self.assertEqual(word_result_zero, (Counter({"12": 1}), 12.0, 12, (12, 1), 0.0))
        word_result_cluster = nlp.word_token_review_length_counter('1-2-1-0-0')
        print(word_result_cluster)
        self.assertEqual(word_result_cluster, (Counter({"22": 1, "7": 1, "6": 1}), 11.666666666666666, 7, (6, 1), 8.962886439832502))
        #Test sent_token_review_length_counter
        sent_result_zero = nlp.sent_token_review_length_counter(0)
        print(sent_result_zero)
        self.assertEqual(sent_result_zero, (Counter({"1": 1}), 1.0, 1, (1, 1), 0.0))
        sent_result_cluster = nlp.sent_token_review_length_counter('1-2-1-0-0')
        print(sent_result_cluster)
        self.assertEqual(sent_result_cluster, (Counter({"1": 2, '3':1}), 1.6666666666666667, 1, (1, 2),  1.1547005383792515))
        #Test char_review_length_counter
        char_result_zero = nlp.char_review_length_counter(0)
        print(char_result_zero)
        self.assertEqual(char_result_zero, (Counter({"53": 1}), 53.0, 53, (53,1), 0.0))
        char_result_cluster = nlp.char_review_length_counter('1-2-1-0-0')
        print(char_result_cluster)
        self.assertEqual(char_result_cluster, (Counter({"101": 1, "31": 1, "30": 1}), 54.0, 31, (30, 1), 40.70626487409524))
        #Test Counter behavior when querying using a value not in the keys
        self.assertEqual(sent_result_cluster[0]['0'], 0)
