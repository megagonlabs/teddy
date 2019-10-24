import json
import logging
import numpy as np
import os
import pandas as pd

from collections import Counter
from flask import Flask
from flask import Response
from flask import request
from flask import send_from_directory
from flask_cors import CORS
from libs import nlp_length_functions
from libs.histogram_comparisons import HistogramComparison
from libs.review_db import ReviewDB

# logging configurations
logging.basicConfig(format='%(filename)s:%(lineno)d %(message)s')
log = logging.getLogger(__name__)
log.setLevel('INFO')

# set up data access
CONFIG = json.load(open("./../config.json"))
data_folder = os.path.join(os.environ['DATA_DIR'], CONFIG['dataset'])
schema = json.load(open(os.path.join(data_folder, 'schema.json')))['schema']
database = ReviewDB(data_folder)

app = Flask(__name__, static_folder = './react-app/build/static', template_folder = './react-app/build')
cors = CORS(app)

app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['TEMPLATES_AUTO_RELOAD'] = True

histogram_comparison_utils = HistogramComparison()

# [Xiong] endpoint for sending static files
@app.route('/data/<path:subpath>')
def data(subpath):    
    res = send_from_directory(f'{data_folder}', subpath)
    return res

# [Xiong] endpoint for loading cluster centroids
# GET Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid: id for locating a cluster
# Returns:
#   A csv string of requested centroids
@app.route('/centroids/')
def centroids():
    res = None
    biz_id = request.args.get('biz_id')
    log.info(f'requesting centroids for {biz_id}')
    cid = request.args.get('cid')
    centroids = database.get_centroids(biz_id, cid)
    # log.info("centroid shape: " + str(centroids.shape[0]))
    if centroids is None:
        return Response(json.dumps({ 'type': 'reviews', 'data': database.get_reviews(biz_id, cid).to_csv() }), status = 200, mimetype = 'application/json')
    return Response(json.dumps({ 'type': 'centroids', 'data': centroids.to_csv() }), status = 200, mimetype = 'application/json')

# [Xiong] endpoint for loading overall information for an entity (or all
# entities). It includes average char, word, sentence length, top words, top
# bigrams, cluster attribute histograms and averaged attributes
# GET Args:
#   biz_id: id for locating an entity (e.g. hotel)
# Returns:
#   A csv string of requested info
@app.route('/global-info/')
def global_info():
    biz_id = request.args.get('biz_id')
    info = database.get_cluster(biz_id, 'all')
    res = Response(info.to_csv(), status = 200, mimetype = 'application/csv')
    return res

# [Xiong] endpoint for loading information for a certain cluster. It includes
# average char, word, sentence length, and cluster attribute histograms. The
# averaged char, word and sentence length and averaged attributes are loaded
# from another endpoint. We probably need to refactor this two endpoints into
# one.
# GET Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid: id for locating a cluster
# Returns:
#   A JSON string of the requested info
@app.route('/cluster-details/')
def cluster_details():
    biz_id = request.args.get('biz_id')
    cid = request.args.get('cid')
    selected_cluster_df = database.get_cluster(biz_id, 'all')
    cluster_row = selected_cluster_df.iloc[0]

    detail = { 'hists': {} }
    for attr in schema:
        detail['hists'][attr] = list(map(lambda x: int(x), cluster_row[attr + '_hist'].split()))
    detail['div'] = (np.array(list(range(-10, 11, 1))) / 10).tolist()

    detail['avgCharLength'] = cluster_row['charLength']
    detail['avgWordLength'] = cluster_row['wordLength']
    detail['avgSentLength'] = cluster_row['sentLength']

    res = Response(json.dumps(detail), status = 200, mimetype = 'application/json')
    return res

# [Xiong] endpoint for /cluster-details/ functionalities but computed on the fly
@app.route('/cluster-details-live/')
def cluster_details_live():
    biz_id = request.args.get('biz_id')
    cid = request.args.get('cid')
    selected_cluster_df = database.get_cluster(biz_id, cid)
    # selected_cluster_df = db.get_cluster_from_id(cid)

    detail = { 'hists': {} }
    div = None
    for attr in schema:
        hist, div = np.histogram(selected_cluster_df[attr], bins = 20, range = (-1, 1))
        detail['hists'][attr] = hist.tolist()
    detail['div'] = div.tolist()

    nlp = nlp_length_functions.NLPLengths(db)
    detail['avgCharLength'] = nlp.char_review_length_counter(cid)[1]
    detail['avgWordLength'] = nlp.word_token_review_length_counter(cid)[1]
    detail['avgSentLength'] = nlp.sent_token_review_length_counter(cid)[1]

    res = Response(json.dumps(detail), status = 200, mimetype = 'application/json')
    return res

# [Xiong] endpoint for computing the distance between the histograms of two clusters.
# GET Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid1: id for locating the first cluster to compare
#   cid2: id for locating the second cluster to compare
# Returns:
#   A JSON string of the distance array
@app.route('/histogram-comparison/')
def histogram_comparison():
    biz_id = request.args.get('biz_id')
    cid1 = request.args.get('cid1')
    cid2 = request.args.get('cid2')
    cluster_row1 = database.get_cluster(biz_id, cid1).iloc[0]
    cluster_row2 = database.get_cluster(biz_id, cid2).iloc[0]
    hist_distances = {}
    for attr in schema:
        hist1 = dict(zip(list(range(20)), list(map(lambda x: int(x), cluster_row1[attr + '_hist'].split()))))
        hist2 = dict(zip(list(range(20)), list(map(lambda x: int(x), cluster_row2[attr + '_hist'].split()))))
        dist = histogram_comparison_utils.hellinger(Counter(hist1), Counter(hist2))
        hist_distances[attr] = dist

    res = Response(json.dumps(hist_distances), status = 200, mimetype = 'application/json')
    return res

# [Xiong] endpoint for computing the top n-grams of specified clusters. If two
# cluster ids are given, a comparison will be done.
# Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid1: id for locating the first cluster to compute
#   cid2 - optional: id for locating the first cluster to compute
#   ngramsize: an interger N specifies what N-gram to compute. Currently only
#           unigram and bigrams are used in the prototype
#   fixed: True or False to compute the second topgram scores for the topgrams
#           from the first cluster
# Returns:
#   A JSON string of an array of topwords objects (word => score)
@app.route('/cluster-topngrams/')
def cluster_topwords():
    # detail['topwords'] = tfidf_model.top_k(cid, 5)
    biz_id = request.args.get('biz_id')
    cid1 = request.args.get('cid1')
    cid2 = request.args.get('cid2')
    ngramsize = int(request.args.get('ngramsize'))

    topwords = [database.get_topwords(biz_id, cid1, ngramsize)]
    # [Xiong] Revise this part to make it more efficient!
    # Right now it's just a simple and dirty hack.
    if cid2 != None:
        topwords.append(database.get_topwords(biz_id, cid2, ngramsize))
    log.info(topwords)
    res = Response(json.dumps(topwords), status = 200, mimetype = 'application/json')
    return res

# [Xiong] endpoint for loading review objects (text and other stats) from
# current working dataframe or freshly from a cluster (resetting working_df).
# If two cluster ids are given, the working_df will be set to concatenation
# of the reviews of two clusters.
# Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid: id for locating the first cluster
#   cid2 - optional: id for locating the second cluster
#   starti: the starting index (for the "load more" feature)
# Returns:
#   A csv string of 10 reviews from working_df
@app.route('/cluster-reviews/')
def cluster_reviews():
    global working_df

    biz_id = request.args.get('biz_id')
    cid = request.args.get('cid')
    cid2 = request.args.get('cid2')
    starti = int(request.args.get('starti'))
    if starti == 0:
        working_df = None

    response_df = select_reviews_from_working_df(biz_id, cid, starti, cid2)

    res = Response(response_df.to_csv(), status = 200, mimetype = 'text/csv')
    return res

# [Xiong] endpoint for running command line code on the server. Essentially what
# we do is to manipulate the working_df.
# Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid: id for locating the first cluster
#   cid2 - optional: id for locating the second cluster
#   code: the function name and arguments of the code we want to run on server.
#   starti: the starting index (this is usually set to 0 from the front-end)
# Returns:
#   A csv string of 10 reviews from working_df after applying the requested operation
@app.route('/remote-run/')
def remote_run():
    global working_df # adding this because we need to write to it

    biz_id = request.args.get('biz_id')
    cid = request.args.get('cid')
    cid2 = request.args.get('cid2')
    code = json.loads(request.args.get('code'))
    starti = int(request.args.get('starti'))
    func = code['func']
    args = code['args']

    response_df = None
    if func == 'tSort':
        attr = args[0]
        ascending = True if len(args) < 2 else args[1]
        working_df = working_df.sort_values(attr, ascending = ascending)
        response_df = select_reviews_from_working_df(biz_id, cid, starti, cid2)
    elif func == 'tFilter':
        attr = args[0]
        working_df = working_df[working_df[attr] != 0]
        response_df = select_reviews_from_working_df(biz_id, cid, starti, cid2)
    elif func == 'tGrep':
        pattern = args[0]
        working_df = working_df[working_df.text.str.contains(pattern)]
        response_df = select_reviews_from_working_df(biz_id, cid, starti, cid2)
    elif func == 'tReset':
        working_df = None
        response_df = select_reviews_from_working_df(biz_id, cid, starti, cid2)
    else:
        # TODO return an error message
        pass

    res = Response(response_df.to_csv(), status = 200, mimetype = 'application/json')
    return res

def select_reviews_from_working_df(biz_id, cid, starti, cid2 = '-1'):
    '''
    Pick 10 reviews from the current working dataframe starting from starti, and
    reset it based on biz_id and cid if working_df is None. The design of
    working_df is because of the command line feature on the front-end. When we
    run remote code, we work on the working_df so that we can keep the original
    data copy intact.
    Args:
        biz_id: id for locating an entity (e.g. hotel)
        cid: id for locating a cluster
        starti: starting index of the working_df (returns 10 reviews from that)
        cid2 - optional: id for locating a second cluster to concatenate with if
            specified.
    Returns:
        dataframe of 10 (or fewer) reviews from working_df
    '''
    global working_df # adding this because we need to write to it

    if working_df is None:
        working_df = database.get_reviews(biz_id, cid)
        if cid2 != '-1':
            working_df = pd.concat([working_df, database.get_reviews(biz_id, cid2)])

    reviews_slice_df = working_df.iloc[starti:starti + 10]

    return reviews_slice_df

if __name__=='__main__':
    app.run(host='0.0.0.0', port=5000)
