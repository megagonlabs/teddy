import unittest
from collections import Counter
from libs.review_db import ReviewDB
from libs.nlp_length_functions import NLPLengths
from libs.histogram_comparisons import HistogramComparison



class HistogramTests(unittest.TestCase):
    def test_density_estimator(self):
        db = ReviewDB('tests/test_data/')
        nlp = NLPLengths(db.entity_db_dict['all'])
        histogram_comparison = HistogramComparison()
        char_result_cluster = nlp.char_review_length_counter('1-2-1-0-0')
        histogram = char_result_cluster[0]
        density_estimate = histogram_comparison.density_estimator(histogram)
        self.assertEqual(sum(density_estimate.values()), 1.0)

    def test_hellinger(self):
        db = ReviewDB('tests/test_data/')
        nlp = NLPLengths(db.entity_db_dict['all'])
        histogram_comparison = HistogramComparison()
        histogram1 = nlp.char_review_length_counter('1-2-1-0-0')[0]
        compare_self = histogram_comparison.hellinger(histogram1, histogram1)
        self.assertEqual(compare_self, 0.0)
        trivial_histogram1 = Counter({"1": 1})
        trivial_histogram2 = Counter({"1": 0})
        compare_trivial = histogram_comparison.hellinger(trivial_histogram1, trivial_histogram2)
        self.assertEqual(compare_trivial, 0.7071067811865475)
        more_complicated_histogram1 = Counter({"1": 1, "2": 2})
        more_complicated_histogram2 = Counter({"2": 3, "3": 4})
        compare_more_complicated = histogram_comparison.hellinger(more_complicated_histogram1, more_complicated_histogram2)
        self.assertLess((compare_more_complicated - 0.6822591268536838), .001)

    def test_chi_square(self):
        db = ReviewDB('tests/test_data/')
        nlp = NLPLengths(db.entity_db_dict['all'])
        histogram_comparison = HistogramComparison()
        histogram1 = nlp.char_review_length_counter('1-2-1-0-0')[0]
        compare_self = histogram_comparison.chi_square(histogram1, histogram1)
        self.assertEqual(compare_self, 0.0)
        trivial_histogram1 = Counter({"1": 1})
        trivial_histogram2 = Counter({"1": 0})
        compare_trivial = histogram_comparison.chi_square(trivial_histogram1, trivial_histogram2)
        self.assertEqual(compare_trivial, 0.5)
        more_complicated_histogram1 = Counter({"1": 1, "2": 2})
        more_complicated_histogram2 = Counter({"2": 3, "3": 4})
        compare_more_complicated = histogram_comparison.chi_square(more_complicated_histogram1, more_complicated_histogram2)
        self.assertLess((compare_more_complicated - 0.4782608695652174), .001)

    def test_euclidean(self):
        db = ReviewDB('tests/test_data/')
        nlp = NLPLengths(db.entity_db_dict['all'])
        histogram_comparison = HistogramComparison()
        histogram1 = nlp.char_review_length_counter('1-2-1-0-0')[0]
        compare_self = histogram_comparison.euclidean(histogram1, histogram1)
        self.assertEqual(compare_self, 0.0)
        trivial_histogram1 = Counter({"1": 1})
        trivial_histogram2 = Counter({"1": 0})
        compare_trivial = histogram_comparison.euclidean(trivial_histogram1, trivial_histogram2)
        self.assertEqual(compare_trivial, 1.0)
        more_complicated_histogram1 = Counter({"1": 1, "2": 2})
        more_complicated_histogram2 = Counter({"2": 3, "3": 4})
        compare_more_complicated = histogram_comparison.euclidean(more_complicated_histogram1, more_complicated_histogram2)
        self.assertLess((compare_more_complicated - 4.24264), .001)

    def test_sorensen(self):
        db = ReviewDB('tests/test_data/')
        nlp = NLPLengths(db.entity_db_dict['all'])
        histogram_comparison = HistogramComparison()
        histogram1 = nlp.char_review_length_counter('1-2-1-0-0')[0]
        compare_self = histogram_comparison.sorensen(histogram1, histogram1)
        self.assertEqual(compare_self, 0.0)
        trivial_histogram1 = Counter({"1": 1})
        trivial_histogram2 = Counter({"1": 0})
        compare_trivial = histogram_comparison.sorensen(trivial_histogram1, trivial_histogram2)
        self.assertEqual(compare_trivial, 1.0)
        more_complicated_histogram1 = Counter({"1": 1, "2": 2})
        more_complicated_histogram2 = Counter({"2": 3, "3": 4})
        compare_more_complicated = histogram_comparison.sorensen(more_complicated_histogram1, more_complicated_histogram2)
        self.assertLess((compare_more_complicated - 0.66667), .001)

    def test_intersection(self):
        db = ReviewDB('tests/test_data/')
        nlp = NLPLengths(db.entity_db_dict['all'])
        histogram_comparison = HistogramComparison()
        histogram1 = nlp.char_review_length_counter('1-2-1-0-0')[0]
        compare_self = histogram_comparison.intersection(histogram1, histogram1)
        self.assertEqual(compare_self, 1.0)
        trivial_histogram1 = Counter({"1": 1})
        trivial_histogram2 = Counter({"1": 0})
        compare_trivial = histogram_comparison.intersection(trivial_histogram1, trivial_histogram2)
        self.assertEqual(compare_trivial, 0.0)
        more_complicated_histogram1 = Counter({"1": 1, "2": 2})
        more_complicated_histogram2 = Counter({"2": 3, "3": 4})
        compare_more_complicated = histogram_comparison.intersection(more_complicated_histogram1, more_complicated_histogram2)
        self.assertLess((compare_more_complicated - 2.0), .001)

    def test_jaccard(self):
        db = ReviewDB('tests/test_data/')
        nlp = NLPLengths(db.entity_db_dict['all'])
        histogram_comparison = HistogramComparison()
        histogram1 = nlp.char_review_length_counter('1-2-1-0-0')[0]
        compare_self = histogram_comparison.jaccard(histogram1, histogram1)
        self.assertEqual(compare_self, 0.0)
        trivial_histogram1 = Counter({"1": 1})
        trivial_histogram2 = Counter({"1": 0})
        compare_trivial = histogram_comparison.jaccard(trivial_histogram1, trivial_histogram2)
        self.assertEqual(compare_trivial, 1.0)
        more_complicated_histogram1 = Counter({"1": 1, "2": 2})
        more_complicated_histogram2 = Counter({"2": 3, "3": 4})
        compare_more_complicated = histogram_comparison.jaccard(more_complicated_histogram1, more_complicated_histogram2)
        self.assertLess((compare_more_complicated - 0.75), .001)

    def test_jensen_shannon(self):
        db = ReviewDB('tests/test_data/')
        nlp = NLPLengths(db.entity_db_dict['all'])
        histogram_comparison = HistogramComparison()
        histogram1 = nlp.char_review_length_counter('1-2-1-0-0')[0]
        compare_self = histogram_comparison.jensen_shannon(histogram1, histogram1)
        self.assertEqual(compare_self, 0.0)
        trivial_histogram1 = Counter({"1": 1})
        trivial_histogram2 = Counter({"1": 0})
        compare_trivial = histogram_comparison.jensen_shannon(trivial_histogram1, trivial_histogram2)
        self.assertLess((compare_trivial - 0.347), .001)
        more_complicated_histogram1 = Counter({"1": 1, "2": 2})
        more_complicated_histogram2 = Counter({"2": 3, "3": 4})
        compare_more_complicated = histogram_comparison.jensen_shannon(more_complicated_histogram1, more_complicated_histogram2)
        self.assertLess((compare_more_complicated - 1.7832), .001)
