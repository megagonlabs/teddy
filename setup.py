from setuptools import find_packages
from setuptools import setup

with open('README.md') as readme_file:
    readme = readme_file.read()

requirements = [
    'Cython==0.29.13',
    'Flask==1.1.1',
    'flask-cors==3.0.8'
    'gensim==3.8.0',
    'lexrank==0.1.0',
    'matplotlib==3.1.1',
    'nltk==3.4.5',
    'nose==1.3.7',
    'numpy==1.17.2',
    'pandas==0.25.1',
    'scikit-learn==0.21.3',
    'seaborn==0.9.0',
    'spacy==2.1.8',
    'swifter==0.295',
    'tqdm==4.35.0'
    ]


setup(

    author="teddyauthors",
    author_email='teddyauthors@gmail.com',
    classifiers=[
        'Development Status :: 2 - Pre-Alpha',
        'License :: OSI Approved :: Apache Software License',
        'Natural Language :: English',
        'Programming Language :: Python :: 3.6',
    ],
    description="",
    install_requires=requirements,
    license="Apache Software License 2.0",
    long_description=readme + '\n\n',
    include_package_data=True,
    name='Teddy',
    packages=find_packages(),
    setup_requires=requirements,
    test_suite='tests',
    tests_require=requirements,
    version='0.1.0',
    zip_safe=False,
)
