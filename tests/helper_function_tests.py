import unittest
import pandas as pd
from libs.review_db import ReviewDB

class HelperTests(unittest.TestCase):

    def test_ReviewDB_init(self):
        '''
            Test initialization of review ids equivalent to original indices as part of
            init for ReviewDB object.
        '''
        clusters_df = pd.read_csv('tests/testing_db.csv', index_col=0)
        db = ReviewDB(clusters_df)
        for i in range(0, 10):
            self.assertEqual(db.clusters_df[db.clusters_df['review_id'] == i].index.item(), i)

    def test_ReviewDB_funcs(self):
        '''
            Test functions in ReviewDB using a toy data set
        '''
        db = ReviewDB.load(cluster_file='tests/testing_db.csv')
        #Test empty
        empty1 = db.decode_id([])
        empty2 = db.fetch_reviews([])
        empty3 = db.get_review_from_id([])
        self.assertEqual(empty1, None)
        self.assertEqual(empty2, None)
        self.assertEqual(empty3, None)
        #Testing db.decode_id()
        decode1 = db.decode_id(0)
        self.assertEqual(decode1, [0])
        decode2 = db.decode_id('1-2-1-0-0')
        self.assertEqual(decode2, [1, 2, 7])
        decode3 = db.decode_id('1-2-1-0')
        self.assertEqual(decode3, [1, 2, 7])
        decode4 = db.decode_id('1-2-1')
        self.assertEqual(decode4, [1, 2, 7])
        decode5 = db.decode_id('1-2')
        self.assertEqual(decode5, [1, 2, 7])
        decode6 = db.decode_id('4')
        self.assertEqual(decode6, [0, 5, 6, 8])
        #Testing db.fetch_reviews()
        fetch1 = db.fetch_reviews([0])
        self.assertEqual(fetch1.iloc[[0]].author.values, 'guest1')
        fetch2 = db.fetch_reviews([0, 3, 7])
        self.assertEqual(fetch2.iloc[[0]].author.values, 'guest1')
        self.assertEqual(fetch2.iloc[[1]].author.values, 'guest4')
        self.assertEqual(fetch2.iloc[[2]].author.values, 'guest8')
        #Testing db.get_review_from_id()
        review1 = db.get_review_from_id(0)
        self.assertEqual(review1.iloc[[0]].author.values, 'guest1')
        review2 = db.get_review_from_id('1-2-1-0-0')
        self.assertEqual(review2.iloc[[0]].author.values, 'guest2')
        self.assertEqual(review2.iloc[[1]].author.values, 'guest3')
        self.assertEqual(review2.iloc[[2]].author.values, 'guest8')
        review3 = db.get_review_from_id('1-2-1-0')
        self.assertEqual(review3.iloc[[0]].author.values, 'guest2')
        self.assertEqual(review3.iloc[[1]].author.values, 'guest3')
        self.assertEqual(review3.iloc[[2]].author.values, 'guest8')
        review4 = db.get_review_from_id('1-2-1')
        self.assertEqual(review4.iloc[[0]].author.values, 'guest2')
        self.assertEqual(review4.iloc[[1]].author.values, 'guest3')
        self.assertEqual(review4.iloc[[2]].author.values, 'guest8')
        review5 = db.get_review_from_id('1-2')
        self.assertEqual(review5.iloc[[0]].author.values, 'guest2')
        self.assertEqual(review5.iloc[[1]].author.values, 'guest3')
        self.assertEqual(review5.iloc[[2]].author.values, 'guest8')
        review6 = db.get_review_from_id('1')
        self.assertEqual(review6.iloc[[0]].author.values, 'guest2')
        self.assertEqual(review6.iloc[[1]].author.values, 'guest3')
        self.assertEqual(review6.iloc[[2]].author.values, 'guest8')
        review7 = db.get_review_from_id('4')
        self.assertEqual(review7.iloc[[0]].author.values, 'guest1')
        self.assertEqual(review7.iloc[[1]].author.values, 'guest6')
        self.assertEqual(review7.iloc[[2]].author.values, 'guest7')
        self.assertEqual(review7.iloc[[3]].author.values, 'guest9')
        #Test access using "all" code for all reviews
        alltest = db.decode_id("all")
        self.assertEqual(alltest, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
        